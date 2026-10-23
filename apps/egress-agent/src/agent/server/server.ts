import { chmod, chown, rm, stat } from 'node:fs/promises';
import type { IncomingMessage, Server, ServerResponse } from 'node:http';
import { createServer } from 'node:http';

import type {
  EgressAgentStatus,
  EgressProbeFacts,
  YoutubeSource
} from '@playliberty/youtube';
import {
  classifyEgressFailure,
  validateYoutubeUrl
} from '@playliberty/youtube';

import { UnknownConfigError } from '../probe/probe.js';

/* The socket is the gate: only the owner may connect, so the pod's uid is the
 * only peer that can reach it. Node has no SO_PEERCRED, and the kernel already
 * enforces this at connect time. */
const SOCKET_MODE = 0o600;
const MAX_BODY_BYTES = 1024;

export interface AgentOptions {
  socketPath: string;
  peerUid: number;
  status: () => Promise<EgressAgentStatus>;
  probe: (name?: string) => Promise<EgressProbeFacts>;
  list: (url: string) => Promise<YoutubeSource>;
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

      throw error;
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
      /* A listing failure is the source's answer, not the agent failing: the
       * server records the classified reason and its own sentence. */
      return {
        status: 502,
        body: {
          error: 'source_unavailable',
          reason: classifyEgressFailure(
            error instanceof Error ? error.message : String(error)
          )
        }
      };
    }
  }

  return { status: 404, body: { error: 'not_found' } };
}

function send(response: ServerResponse, result: AgentResponse): void {
  response.writeHead(result.status, { 'content-type': 'application/json' });
  response.end(JSON.stringify(result.body));
}

export async function startAgent(options: AgentOptions): Promise<AgentHandle> {
  const server = createServer((request, response) => {
    void route(request, options).then(
      result => send(response, result),
      () => send(response, { status: 500, body: { error: 'internal' } })
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
