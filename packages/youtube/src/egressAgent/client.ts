import { request } from 'node:http';

import type {
  EgressAgentStatus,
  EgressFailure,
  EgressProbeFacts,
  IEgressAgentClient
} from '../types.js';

/* The read may not hang on a wedged agent: "unreachable" is an answer the page
 * can draw faster than a person gives up. A probe is a listing extraction, so
 * it gets the room one takes. */
const STATUS_TIMEOUT_MS = 2000;
const PROBE_TIMEOUT_MS = 120_000;

const FAILURES = new Set<EgressFailure>([
  'blocked',
  'unavailable',
  'network',
  'unknown'
]);

/* A name the agent does not have is the caller's mistake, not an outage. */
export class EgressConfigUnknownError extends Error {
  readonly configName: string;

  constructor(configName: string) {
    super(`The egress agent has no config named "${configName}".`);
    this.name = 'EgressConfigUnknownError';
    this.configName = configName;
  }
}

/* A non-200 the caller has to interpret: 400 is an unknown config, anything
 * else is the agent failing. */
class AgentResponseError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`The egress agent answered ${String(status)}.`);
    this.name = 'AgentResponseError';
    this.status = status;
  }
}

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

function parseProbeFacts(value: unknown): EgressProbeFacts {
  if (
    !isRecord(value) ||
    typeof value.listing !== 'boolean' ||
    (value.handshake !== null && typeof value.handshake !== 'boolean') ||
    (value.reason !== null &&
      (typeof value.reason !== 'string' ||
        !FAILURES.has(value.reason as EgressFailure)))
  ) {
    throw new Error('The egress agent answered an unexpected probe result.');
  }

  return {
    handshake: value.handshake as boolean | null,
    listing: value.listing,
    exitIp: optionalString(value.exitIp, 'exit address'),
    reason: value.reason as EgressFailure | null,
    active: optionalString(value.active, 'active config')
  };
}

interface AgentRequest {
  socketPath: string;
  method: 'GET' | 'POST';
  path: string;
  body?: unknown;
  timeoutMs: number;
}

function readJson(options: AgentRequest): Promise<unknown> {
  const payload =
    options.body === undefined ? null : JSON.stringify(options.body);

  return new Promise((resolve, reject) => {
    const req = request(
      {
        socketPath: options.socketPath,
        path: options.path,
        method: options.method,
        timeout: options.timeoutMs,
        headers:
          payload === null
            ? undefined
            : {
                'content-type': 'application/json',
                'content-length': Buffer.byteLength(payload)
              }
      },
      response => {
        let body = '';
        response.setEncoding('utf8');
        response.on('data', chunk => {
          body += String(chunk);
        });
        response.on('end', () => {
          if (response.statusCode !== 200) {
            reject(new AgentResponseError(response.statusCode ?? 0));
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

    if (payload !== null) {
      req.write(payload);
    }

    req.end();
  });
}

/* The server's end of the egress agent socket. There is no port and no origin:
 * the agent owns the socket's permissions. */
export class EgressAgentClient implements IEgressAgentClient {
  constructor(private readonly _socketPath: string) {}

  public async status(): Promise<EgressAgentStatus> {
    return parseEgressAgentStatus(
      await readJson({
        socketPath: this._socketPath,
        method: 'GET',
        path: '/status',
        timeoutMs: STATUS_TIMEOUT_MS
      })
    );
  }

  public async probe(name?: string): Promise<EgressProbeFacts> {
    try {
      return parseProbeFacts(
        await readJson({
          socketPath: this._socketPath,
          method: 'POST',
          path: '/probe',
          body: name === undefined ? {} : { name },
          timeoutMs: PROBE_TIMEOUT_MS
        })
      );
    } catch (error) {
      if (error instanceof AgentResponseError && error.status === 400) {
        throw new EgressConfigUnknownError(name ?? 'unknown');
      }

      throw error;
    }
  }
}
