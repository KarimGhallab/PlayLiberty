import { createReadStream } from 'node:fs';
import { chmod, chown, mkdtemp, rm, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import type { IncomingMessage, Server, ServerResponse } from 'node:http';
import { tmpdir } from 'node:os';
import { extname, join } from 'node:path';
import { pipeline } from 'node:stream/promises';

import type {
  AgentFetchRequest,
  EgressAgentStatus,
  EgressProbeFacts,
  YoutubeSource
} from '@playliberty/youtube';
import {
  YoutubeSponsorBlockError,
  YoutubeVideoUnavailableError,
  classifyEgressFailure,
  validateYoutubeUrl
} from '@playliberty/youtube';

import { UnknownConfigError } from '../probe/probe.js';
import {
  DEFAULT_DRAIN_TIMEOUT_MS,
  SwitchInterruptedError
} from '../switch/switch.js';

/* The socket is the gate: only the owner may connect, so the pod's uid is the
 * only peer that can reach it. Node has no SO_PEERCRED, and the kernel already
 * enforces this at connect time. */
const SOCKET_MODE = 0o600;
const MAX_BODY_BYTES = 4096;

export interface AgentOptions {
  socketPath: string;
  peerUid: number;
  status: () => Promise<EgressAgentStatus>;
  probe: (name?: string) => Promise<EgressProbeFacts>;
  list: (url: string) => Promise<YoutubeSource>;
  /* The route owns the temp directory; the fetcher writes into it and the
   * route removes it once the bytes have left. */
  fetch: (
    request: AgentFetchRequest & { tempDir: string }
  ) => Promise<{ filePath: string }>;
  switch: (name: string, drainTimeoutMs: number) => Promise<void>;
}

export interface AgentHandle {
  socketPath: string;
  close(): Promise<void>;
}

interface AgentResponse {
  status: number;
  body: unknown;
}

async function ownSocket(socketPath: string, peerUid: number): Promise<void> {
  const current = await stat(socketPath);

  if (current.uid !== peerUid) {
    if (process.getuid?.() !== 0) {
      throw new Error(
        `The socket belongs to uid ${String(current.uid)} and this process is not root, so it cannot hand it to uid ${String(peerUid)}.`
      );
    }

    await chown(socketPath, peerUid, current.gid);
  }

  await chmod(socketPath, SOCKET_MODE);
}

function listen(server: Server, socketPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(socketPath, () => {
      server.off('error', reject);
      resolve();
    });
  });
}

function readBody(request: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let body = '';
    request.setEncoding('utf8');
    request.on('data', chunk => {
      body += String(chunk);

      if (body.length > MAX_BODY_BYTES) {
        reject(new Error('The request body is too large.'));
        request.destroy();
      }
    });
    request.on('end', () => {
      try {
        resolve(body.trim().length === 0 ? {} : JSON.parse(body));
      } catch {
        reject(new Error('The request body is not JSON.'));
      }
    });
    request.on('error', reject);
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

interface FetchBody {
  videoId: string;
  skipNonMusic: boolean;
  timeoutMs: number;
  download: AgentFetchRequest['download'];
}

const DOWNLOAD_NUMBERS = [
  'concurrency',
  'sleepRequests',
  'sleepIntervalMin',
  'sleepIntervalMax',
  'retries',
  'fragmentRetries',
  'fileAccessRetries',
  'socketTimeout'
] as const;

function parseFetchBody(value: unknown): FetchBody | null {
  if (
    !isRecord(value) ||
    typeof value.videoId !== 'string' ||
    value.videoId.length === 0 ||
    typeof value.skipNonMusic !== 'boolean' ||
    typeof value.timeoutMs !== 'number' ||
    !Number.isInteger(value.timeoutMs) ||
    value.timeoutMs <= 0 ||
    !isRecord(value.download)
  ) {
    return null;
  }

  const download = value.download;

  if (
    DOWNLOAD_NUMBERS.some(field => typeof download[field] !== 'number') ||
    typeof download.limitRate !== 'string' ||
    download.limitRate.length === 0
  ) {
    return null;
  }

  return {
    videoId: value.videoId,
    skipNonMusic: value.skipNonMusic,
    timeoutMs: value.timeoutMs,
    download: download as unknown as FetchBody['download']
  };
}

function sendJson(
  response: ServerResponse,
  status: number,
  body: unknown
): void {
  response.writeHead(status, { 'content-type': 'application/json' });
  response.end(JSON.stringify(body));
}

async function route(
  request: IncomingMessage,
  options: AgentOptions
): Promise<AgentResponse> {
  const path = request.url?.split('?')[0] ?? '';

  if (request.method === 'GET' && path === '/status') {
    return { status: 200, body: await options.status() };
  }

  if (request.method === 'POST' && path === '/probe') {
    const body = await readBody(request);

    if (!isRecord(body)) {
      return { status: 400, body: { error: 'invalid_request' } };
    }

    const name = body.name;

    if (name !== undefined && (typeof name !== 'string' || name.length === 0)) {
      return { status: 400, body: { error: 'invalid_request' } };
    }

    try {
      return {
        status: 200,
        body: await options.probe(typeof name === 'string' ? name : undefined)
      };
    } catch (error) {
      if (error instanceof UnknownConfigError) {
        return { status: 400, body: { error: 'unknown_config' } };
      }

      return {
        status: 503,
        body: { error: 'switch_failed', detail: messageOf(error) }
      };
    }
  }

  if (request.method === 'POST' && path === '/list') {
    const body = await readBody(request);

    if (
      !isRecord(body) ||
      typeof body.url !== 'string' ||
      body.url.length === 0
    ) {
      return { status: 400, body: { error: 'invalid_request' } };
    }

    try {
      validateYoutubeUrl(body.url);
    } catch {
      return { status: 400, body: { error: 'invalid_source' } };
    }

    try {
      return { status: 200, body: await options.list(body.url) };
    } catch (error) {
      if (error instanceof SwitchInterruptedError) {
        return { status: 503, body: { error: 'switching' } };
      }

      /* A listing failure is the source's answer, not the agent failing: the
       * server records the classified reason and its own sentence. */
      return {
        status: 502,
        body: {
          error: 'source_unavailable',
          reason: classifyEgressFailure(messageOf(error))
        }
      };
    }
  }

  if (request.method === 'POST' && path === '/switch') {
    const body = await readBody(request);

    if (
      !isRecord(body) ||
      typeof body.name !== 'string' ||
      body.name.length === 0 ||
      (body.drainTimeoutMs !== undefined &&
        (typeof body.drainTimeoutMs !== 'number' ||
          !Number.isInteger(body.drainTimeoutMs) ||
          body.drainTimeoutMs <= 0))
    ) {
      return { status: 400, body: { error: 'invalid_request' } };
    }

    try {
      await options.switch(
        body.name,
        typeof body.drainTimeoutMs === 'number'
          ? body.drainTimeoutMs
          : DEFAULT_DRAIN_TIMEOUT_MS
      );
    } catch (error) {
      if (error instanceof UnknownConfigError) {
        return { status: 400, body: { error: 'unknown_config' } };
      }

      return {
        status: 503,
        body: { error: 'switch_failed', detail: messageOf(error) }
      };
    }

    return { status: 200, body: await options.status() };
  }

  return { status: 404, body: { error: 'not_found' } };
}

/* The one route that answers with bytes: the temp directory belongs to this
 * call, and it is removed whether the stream finished or failed. */
async function streamFetch(
  request: IncomingMessage,
  response: ServerResponse,
  options: AgentOptions
): Promise<void> {
  const parsed = parseFetchBody(await readBody(request));

  if (parsed === null) {
    sendJson(response, 400, { error: 'invalid_request' });
    return;
  }

  const directory = await mkdtemp(join(tmpdir(), 'playliberty-egress-'));

  try {
    const result = await options.fetch({ ...parsed, tempDir: directory });
    const extension = extname(result.filePath).slice(1);
    const size = (await stat(result.filePath)).size;

    response.writeHead(200, {
      'content-type': 'application/octet-stream',
      'content-length': size,
      'x-source-extension': extension
    });

    await pipeline(createReadStream(result.filePath), response);
  } catch (error) {
    if (response.headersSent) {
      response.destroy();
    } else if (error instanceof SwitchInterruptedError) {
      sendJson(response, 503, { error: 'switching' });
    } else if (error instanceof YoutubeVideoUnavailableError) {
      sendJson(response, 410, { error: 'unavailable' });
    } else if (error instanceof YoutubeSponsorBlockError) {
      sendJson(response, 502, { error: 'sponsorblock' });
    } else {
      sendJson(response, 502, {
        error: 'source_unavailable',
        reason: classifyEgressFailure(messageOf(error))
      });
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

export async function startAgent(options: AgentOptions): Promise<AgentHandle> {
  const server = createServer((request, response) => {
    const path = request.url?.split('?')[0] ?? '';

    if (request.method === 'POST' && path === '/fetch') {
      void streamFetch(request, response, options).catch(() => {
        if (!response.headersSent) {
          sendJson(response, 500, { error: 'internal' });
        } else {
          response.destroy();
        }
      });
      return;
    }

    void route(request, options).then(
      result => sendJson(response, result.status, result.body),
      () => sendJson(response, 500, { error: 'internal' })
    );
  });

  await rm(options.socketPath, { force: true });
  await listen(server, options.socketPath);
  await ownSocket(options.socketPath, options.peerUid);

  return {
    socketPath: options.socketPath,
    close: async (): Promise<void> => {
      await new Promise<void>((resolve, reject) => {
        server.close(error => (error ? reject(error) : resolve()));
      });
      await rm(options.socketPath, { force: true });
    }
  };
}
