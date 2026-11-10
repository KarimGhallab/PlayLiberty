import { createReadStream } from 'node:fs';
import { chmod, chown, mkdtemp, rm, stat } from 'node:fs/promises';
import type { IncomingMessage, Server, ServerResponse } from 'node:http';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { extname, join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { pipeline } from 'node:stream/promises';

import type {
  AgentReply,
  EgressAgentStatus,
  EgressCheckFacts,
  FetchBody,
  YoutubeSource
} from '@playliberty/youtube';
import {
  AgentErrorCode,
  AgentHeader,
  AgentHttpStatus,
  AgentMethod,
  AgentRoute,
  YoutubeSponsorBlockError,
  YoutubeVideoUnavailableError,
  classifySourceFailure,
  parseApplyBody,
  parseFetchBody,
  parseListBody,
  parseSwitchBody,
  validateYoutubeUrl,
  wireReply
} from '@playliberty/youtube';

import { logger } from '../../logging/logger.js';
import {
  DEFAULT_DRAIN_TIMEOUT_MS,
  SwitchInterruptedError,
  UnknownConfigError
} from '../switch/switch.js';

/* The socket is the gate: only the owner may connect, so the pod's uid is the
 * only peer that can reach it. Node has no SO_PEERCRED, and the kernel already
 * enforces this at connect time. */
const SOCKET_MODE = 0o600;
const MAX_BODY_BYTES = 4096;

/* The access-log sink: a test passes a silent one, the process the module logger. */
export interface AgentLog {
  info(context: object, message: string): void;
  warn(context: object, message: string): void;
}

export interface AgentOptions {
  socketPath: string;
  peerUid: number;
  status: () => Promise<EgressAgentStatus>;
  /* The switch action applies the config if needed, then checks it. */
  switch: (name?: string) => Promise<EgressCheckFacts>;
  /* The check action reads the active config and never switches. */
  check: () => Promise<EgressCheckFacts>;
  /* The rotation primitive: apply the config without checking it. */
  apply: (name: string, drainTimeoutMs: number) => Promise<void>;
  list: (url: string) => Promise<YoutubeSource>;
  /* The route owns the temp directory; the fetcher writes into it and the
   * route removes it once the bytes have left. */
  fetch: (
    request: FetchBody & { tempDir: string }
  ) => Promise<{ filePath: string }>;
  log?: AgentLog;
}

export interface AgentHandle {
  socketPath: string;
  close(): Promise<void>;
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

/* A body the transport could not read is the request's fault, not the
 * agent's: the protocol turns the null into `invalid_request`. */
async function bodyOf(request: IncomingMessage): Promise<unknown> {
  try {
    return await readBody(request);
  } catch {
    return null;
  }
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function sendReply(response: ServerResponse, reply: AgentReply): void {
  const wired = wireReply(reply);

  response.writeHead(wired.status, { 'content-type': 'application/json' });
  response.end(JSON.stringify(wired.body));
}

async function route(
  request: IncomingMessage,
  options: AgentOptions
): Promise<AgentReply> {
  const path = request.url?.split('?')[0] ?? '';

  if (request.method === AgentMethod.Get && path === AgentRoute.Status) {
    return { outcome: 'ok', body: await options.status() };
  }

  if (request.method === AgentMethod.Post && path === AgentRoute.Switch) {
    const body = parseSwitchBody(await bodyOf(request));

    if (body === null) {
      return { outcome: AgentErrorCode.InvalidRequest };
    }

    try {
      return {
        outcome: 'ok',
        body: await options.switch(body.name)
      };
    } catch (error) {
      if (error instanceof UnknownConfigError) {
        return { outcome: AgentErrorCode.UnknownConfig };
      }

      return {
        outcome: AgentErrorCode.SwitchFailed,
        detail: messageOf(error)
      };
    }
  }

  if (request.method === AgentMethod.Post && path === AgentRoute.Check) {
    return { outcome: 'ok', body: await options.check() };
  }

  if (request.method === AgentMethod.Post && path === AgentRoute.List) {
    const body = parseListBody(await bodyOf(request));

    if (body === null) {
      return { outcome: AgentErrorCode.InvalidRequest };
    }

    try {
      validateYoutubeUrl(body.url);
    } catch {
      return { outcome: AgentErrorCode.InvalidSource };
    }

    try {
      return { outcome: 'ok', body: await options.list(body.url) };
    } catch (error) {
      if (error instanceof SwitchInterruptedError) {
        return { outcome: AgentErrorCode.Switching };
      }

      /* A listing failure is the source's answer, not the agent failing: the
       * server records the classified reason and its own sentence. */
      return {
        outcome: AgentErrorCode.SourceUnavailable,
        reason: classifySourceFailure(messageOf(error))
      };
    }
  }

  if (request.method === AgentMethod.Post && path === AgentRoute.Apply) {
    const body = parseApplyBody(await bodyOf(request));

    if (body === null) {
      return { outcome: AgentErrorCode.InvalidRequest };
    }

    try {
      await options.apply(
        body.name,
        body.drainTimeoutMs ?? DEFAULT_DRAIN_TIMEOUT_MS
      );
    } catch (error) {
      if (error instanceof UnknownConfigError) {
        return { outcome: AgentErrorCode.UnknownConfig };
      }

      return {
        outcome: AgentErrorCode.SwitchFailed,
        detail: messageOf(error)
      };
    }

    return { outcome: 'ok', body: await options.status() };
  }

  return { outcome: AgentErrorCode.NotFound };
}

/* The one route that answers with bytes: the temp directory belongs to this
 * call, and it is removed whether the stream finished or failed. */
async function streamFetch(
  request: IncomingMessage,
  response: ServerResponse,
  options: AgentOptions
): Promise<void> {
  const parsed = parseFetchBody(await bodyOf(request));

  if (parsed === null) {
    sendReply(response, { outcome: AgentErrorCode.InvalidRequest });
    return;
  }

  const directory = await mkdtemp(join(tmpdir(), 'playliberty-egress-'));

  try {
    const result = await options.fetch({ ...parsed, tempDir: directory });
    const extension = extname(result.filePath).slice(1);
    const size = (await stat(result.filePath)).size;

    response.writeHead(AgentHttpStatus.Ok, {
      'content-type': 'application/octet-stream',
      'content-length': size,
      [AgentHeader.SourceExtension]: extension
    });

    await pipeline(createReadStream(result.filePath), response);
  } catch (error) {
    if (response.headersSent) {
      response.destroy();
    } else if (error instanceof SwitchInterruptedError) {
      sendReply(response, { outcome: AgentErrorCode.Switching });
    } else if (error instanceof YoutubeVideoUnavailableError) {
      sendReply(response, { outcome: AgentErrorCode.Unavailable });
    } else if (error instanceof YoutubeSponsorBlockError) {
      sendReply(response, { outcome: AgentErrorCode.SponsorBlock });
    } else {
      sendReply(response, {
        outcome: AgentErrorCode.SourceUnavailable,
        reason: classifySourceFailure(messageOf(error))
      });
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

/* The body never enters the log: a fetch response is a whole track. */
function traceRequest(
  request: IncomingMessage,
  response: ServerResponse,
  log: AgentLog
): void {
  const method = request.method ?? '';
  const path = request.url?.split('?')[0] ?? '';
  const startedAt = performance.now();

  log.info({ event: 'agent_request', method, path }, 'agent request');

  response.once('finish', () => {
    log.info(
      {
        event: 'agent_response',
        method,
        path,
        status: response.statusCode,
        durationMs: Math.round(performance.now() - startedAt)
      },
      'agent response'
    );
  });

  /* A peer that hangs up mid-download never reaches `finish`. */
  response.once('close', () => {
    if (response.writableFinished) {
      return;
    }

    log.warn(
      {
        event: 'agent_response_aborted',
        method,
        path,
        status: response.statusCode,
        durationMs: Math.round(performance.now() - startedAt)
      },
      'agent response aborted'
    );
  });
}

export async function startAgent(options: AgentOptions): Promise<AgentHandle> {
  const log = options.log ?? logger;
  const server = createServer((request, response) => {
    traceRequest(request, response, log);

    const path = request.url?.split('?')[0] ?? '';

    if (request.method === AgentMethod.Post && path === AgentRoute.Fetch) {
      void streamFetch(request, response, options).catch(() => {
        if (!response.headersSent) {
          sendReply(response, { outcome: AgentErrorCode.Internal });
        } else {
          response.destroy();
        }
      });
      return;
    }

    void route(request, options).then(
      reply => sendReply(response, reply),
      () => sendReply(response, { outcome: AgentErrorCode.Internal })
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
