import { request } from 'node:http';

import type { EgressAgentStatus, IEgressAgentClient } from '../types.js';

/* The read may not hang on a wedged agent: "unreachable" is an answer the page
 * can draw faster than a person gives up. */
const STATUS_TIMEOUT_MS = 2000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function optionalString(value: unknown, field: string): string | null {
  if (value === null) {
    return null;
  }

  if (typeof value !== 'string') {
    throw new Error(`The egress agent's ${field} is not a string or null.`);
  }

  return value;
}

/* The agent is ours, but a malformed answer must fail here rather than reach a
 * page that trusts it. */
function parseEgressAgentStatus(value: unknown): EgressAgentStatus {
  if (!isRecord(value) || !Array.isArray(value.pool)) {
    throw new Error('The egress agent answered an unexpected payload.');
  }

  const pool = value.pool.map(entry => {
    if (
      !isRecord(entry) ||
      typeof entry.name !== 'string' ||
      entry.name.length === 0
    ) {
      throw new Error('The egress agent reported a config without a name.');
    }

    return {
      name: entry.name,
      endpoint: optionalString(entry.endpoint, 'endpoint')
    };
  });

  return {
    pool,
    active: optionalString(value.active, 'active config'),
    loadedSince: optionalString(value.loadedSince, 'load time')
  };
}

function readJson(socketPath: string, path: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const req = request(
      {
        socketPath,
        path,
        method: 'GET',
        timeout: STATUS_TIMEOUT_MS
      },
      response => {
        let body = '';
        response.setEncoding('utf8');
        response.on('data', chunk => {
          body += String(chunk);
        });
        response.on('end', () => {
          if (response.statusCode !== 200) {
            reject(
              new Error(
                `The egress agent answered ${String(response.statusCode)}.`
              )
            );
            return;
          }

          try {
            resolve(JSON.parse(body));
          } catch {
            reject(new Error('The egress agent answered invalid JSON.'));
          }
        });
      }
    );

    req.on('timeout', () => {
      req.destroy(new Error('The egress agent did not answer in time.'));
    });
    req.on('error', reject);
    req.end();
  });
}

/* The server's end of the egress agent socket. There is no port and no origin: the
 * agent owns the socket's permissions. */
export class EgressAgentClient implements IEgressAgentClient {
  constructor(private readonly _socketPath: string) {}

  public async status(): Promise<EgressAgentStatus> {
    return parseEgressAgentStatus(await readJson(this._socketPath, '/status'));
  }
}
