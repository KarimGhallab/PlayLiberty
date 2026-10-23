import { chmod, chown, rm, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import type { Server } from 'node:http';

import type { EgressAgentStatus } from '@playliberty/youtube';

/* The socket is the gate: only the owner may connect, so the pod's uid is the
 * only peer that can reach it. Node has no SO_PEERCRED, and the kernel already
 * enforces this at connect time. */
const SOCKET_MODE = 0o600;

export interface AgentOptions {
  socketPath: string;
  peerUid: number;
  status: () => Promise<EgressAgentStatus>;
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

export async function startAgent(options: AgentOptions): Promise<AgentHandle> {
  const server = createServer((request, response) => {
    if (request.method !== 'GET' || request.url !== '/status') {
      response.writeHead(404, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ error: 'not_found' }));
      return;
    }

    void options.status().then(
      status => {
        response.writeHead(200, { 'content-type': 'application/json' });
        response.end(JSON.stringify(status));
      },
      error => {
        response.writeHead(500, { 'content-type': 'application/json' });
        response.end(
          JSON.stringify({
            error: 'status_failed',
            detail: error instanceof Error ? error.message : 'unknown'
          })
        );
      }
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
