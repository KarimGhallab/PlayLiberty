import { createWriteStream } from 'node:fs';
import { mkdir, rm } from 'node:fs/promises';
import type { IncomingMessage } from 'node:http';
import { request } from 'node:http';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';

import {
  YoutubeSponsorBlockError,
  YoutubeVideoUnavailableError
} from '../errors/errors.js';
import type {
  AgentFetchRequest,
  EgressAgentStatus,
  EgressCheckFacts,
  EgressFailure,
  FetchedTrack,
  IEgressAgentClient,
  YoutubeSource,
  YoutubeSourceEntry
} from '../types.js';
import { YoutubeSourceKind } from '../types.js';

/* The read may not hang on a wedged agent: "unreachable" is an answer the page
 * can draw faster than a person gives up. A switch or a check is a yt-dlp run,
 * so it gets the room one takes. */
const STATUS_TIMEOUT_MS = 2000;
const LIST_TIMEOUT_MS = 120_000;

const FAILURES = new Set<EgressFailure>([
  'blocked',
  'unavailable',
  'network',
  'unknown'
]);

/* Fixed sentences: the sync run records one of these, never the tool's stderr. */
const SOURCE_FAILURE_MESSAGES: Record<EgressFailure, string> = {
  blocked: 'YouTube refused the request from the exit.',
  unavailable: 'The source is not available.',
  network: 'The exit could not be reached.',
  unknown: 'The source could not be read.'
};

/* A name the agent does not have is the caller's mistake, not an outage. */
export class EgressConfigUnknownError extends Error {
  readonly configName: string;

  constructor(configName: string) {
    super(`The egress agent has no config named "${configName}".`);
    this.name = 'EgressConfigUnknownError';
    this.configName = configName;
  }
}

/* The source URL itself is wrong, so retrying the sync cannot help. */
export class EgressSourceInvalidError extends Error {
  constructor() {
    super('The source URL is not a valid YouTube URL.');
    this.name = 'EgressSourceInvalidError';
  }
}

/* The exit could not read the source. The reason is the classified code; the
 * message is a sentence a run can carry. */
export class EgressSourceUnavailableError extends Error {
  readonly reason: EgressFailure;

  constructor(reason: EgressFailure) {
    super(SOURCE_FAILURE_MESSAGES[reason]);
    this.name = 'EgressSourceUnavailableError';
    this.reason = reason;
  }
}

/* The socket or the stream died mid-download. Not the track's fault: the claim
 * goes back to pending instead of becoming a failed row. */
export class EgressStreamError extends Error {
  constructor() {
    super('The egress agent did not finish the download.');
    this.name = 'EgressStreamError';
  }
}

/* A rotation drained this read. It is not an exit failure, so it must not
 * count; the next pass starts on the config that is now loaded. */
export class EgressSwitchError extends Error {
  constructor() {
    super('The exit switched while the source was being read.');
    this.name = 'EgressSwitchError';
  }
}

/* The agent was asked to switch and could not. The active row is unchanged. */
export class EgressSwitchFailedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EgressSwitchFailedError';
  }
}

function switchFailureOf(body: unknown): EgressSwitchFailedError {
  const detail = isRecord(body) ? body.detail : null;

  return new EgressSwitchFailedError(
    typeof detail === 'string' && detail.length > 0
      ? detail
      : 'The exit could not be switched.'
  );
}

/* A non-200 the caller has to interpret: 400 is an unknown config or a bad
 * source, anything else is the agent failing. */
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

function failureOf(value: unknown): EgressFailure {
  return typeof value === 'string' && FAILURES.has(value as EgressFailure)
    ? (value as EgressFailure)
    : 'unknown';
}

/* The agent is ours, but a malformed answer must fail here rather than reach a
 * page or a sync that trusts it. */
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

function parseCheckFacts(value: unknown): EgressCheckFacts {
  if (
    !isRecord(value) ||
    typeof value.listing !== 'boolean' ||
    (value.handshake !== null && typeof value.handshake !== 'boolean') ||
    (value.reason !== null &&
      (typeof value.reason !== 'string' ||
        !FAILURES.has(value.reason as EgressFailure)))
  ) {
    throw new Error('The egress agent answered an unexpected check result.');
  }

  return {
    handshake: value.handshake as boolean | null,
    listing: value.listing,
    exitIp: optionalString(value.exitIp, 'exit address'),
    reason: value.reason as EgressFailure | null,
    active: optionalString(value.active, 'active config')
  };
}

function parseEntry(value: unknown): YoutubeSourceEntry {
  if (
    !isRecord(value) ||
    typeof value.videoId !== 'string' ||
    typeof value.title !== 'string' ||
    (value.durationSeconds !== null &&
      typeof value.durationSeconds !== 'number') ||
    (value.thumbnailUrl !== null && typeof value.thumbnailUrl !== 'string')
  ) {
    throw new Error('The egress agent reported an unexpected source entry.');
  }

  return {
    videoId: value.videoId,
    title: value.title,
    durationSeconds: value.durationSeconds,
    thumbnailUrl: value.thumbnailUrl
  };
}

function parseYoutubeSource(value: unknown): YoutubeSource {
  if (
    !isRecord(value) ||
    (value.kind !== YoutubeSourceKind.Playlist &&
      value.kind !== YoutubeSourceKind.Video) ||
    typeof value.sourceId !== 'string' ||
    typeof value.title !== 'string' ||
    !Array.isArray(value.entries)
  ) {
    throw new Error('The egress agent reported an unexpected source.');
  }

  return {
    kind: value.kind,
    sourceId: value.sourceId,
    title: value.title,
    entries: value.entries.map(parseEntry)
  };
}

interface AgentRequest {
  socketPath: string;
  method: 'GET' | 'POST';
  path: string;
  body?: unknown;
  timeoutMs: number;
}

interface AgentResult {
  status: number;
  body: unknown;
}

function requestJson(options: AgentRequest): Promise<AgentResult> {
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
          try {
            resolve({
              status: response.statusCode ?? 0,
              body: body.length === 0 ? null : JSON.parse(body)
            });
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

function expectOk(result: AgentResult): unknown {
  if (result.status !== 200) {
    throw new AgentResponseError(result.status);
  }

  return result.body;
}

/* A fetch answers with the file itself, so its non-200 body is read separately
 * and the success path is piped straight to disk. */
function requestStream(options: AgentRequest): Promise<{
  status: number;
  response: IncomingMessage;
}> {
  const payload = JSON.stringify(options.body);

  return new Promise((resolve, reject) => {
    const req = request(
      {
        socketPath: options.socketPath,
        path: options.path,
        method: options.method,
        timeout: options.timeoutMs,
        headers: {
          'content-type': 'application/json',
          'content-length': Buffer.byteLength(payload)
        }
      },
      response => resolve({ status: response.statusCode ?? 0, response })
    );

    req.on('timeout', () => {
      req.destroy(new Error('The egress agent did not answer in time.'));
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function readSmallBody(response: IncomingMessage): Promise<unknown> {
  let body = '';

  for await (const chunk of response) {
    body += String(chunk);

    if (body.length > 4096) {
      break;
    }
  }

  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
}

/* The server's end of the egress agent socket. There is no port and no origin:
 * the agent owns the socket's permissions. */
export class EgressAgentClient implements IEgressAgentClient {
  constructor(private readonly _socketPath: string) {}

  public async status(): Promise<EgressAgentStatus> {
    return parseEgressAgentStatus(
      expectOk(
        await requestJson({
          socketPath: this._socketPath,
          method: 'GET',
          path: '/status',
          timeoutMs: STATUS_TIMEOUT_MS
        })
      )
    );
  }

  public async switch(name?: string): Promise<EgressCheckFacts> {
    const result = await requestJson({
      socketPath: this._socketPath,
      method: 'POST',
      path: '/switch',
      body: name === undefined ? {} : { name },
      timeoutMs: LIST_TIMEOUT_MS
    });

    if (result.status === 400) {
      throw new EgressConfigUnknownError(name ?? 'unknown');
    }

    if (result.status === 503) {
      throw switchFailureOf(result.body);
    }

    return parseCheckFacts(expectOk(result));
  }

  public async check(): Promise<EgressCheckFacts> {
    const result = await requestJson({
      socketPath: this._socketPath,
      method: 'POST',
      path: '/check',
      timeoutMs: LIST_TIMEOUT_MS
    });

    return parseCheckFacts(expectOk(result));
  }

  public async list(url: string): Promise<YoutubeSource> {
    const result = await requestJson({
      socketPath: this._socketPath,
      method: 'POST',
      path: '/list',
      body: { url },
      timeoutMs: LIST_TIMEOUT_MS
    });

    if (result.status === 400) {
      throw new EgressSourceInvalidError();
    }

    if (result.status === 503) {
      throw new EgressSwitchError();
    }

    if (result.status === 502) {
      throw new EgressSourceUnavailableError(
        failureOf(isRecord(result.body) ? result.body.reason : null)
      );
    }

    return parseYoutubeSource(expectOk(result));
  }

  public async applyConfig(
    name: string,
    drainTimeoutMs: number
  ): Promise<EgressAgentStatus> {
    const result = await requestJson({
      socketPath: this._socketPath,
      method: 'POST',
      path: '/apply',
      body: { name, drainTimeoutMs },
      /* The drain runs before the agent answers, so the wait is the bound. */
      timeoutMs: drainTimeoutMs + 30_000
    });

    if (result.status === 400) {
      throw new EgressConfigUnknownError(name);
    }

    if (result.status === 503) {
      throw switchFailureOf(result.body);
    }

    return parseEgressAgentStatus(expectOk(result));
  }

  public async fetchTrack(request: AgentFetchRequest): Promise<FetchedTrack> {
    await mkdir(request.tempDir, { recursive: true });

    let response: IncomingMessage;
    let status: number;

    try {
      ({ status, response } = await requestStream({
        socketPath: this._socketPath,
        method: 'POST',
        path: '/fetch',
        body: {
          videoId: request.videoId,
          skipNonMusic: request.skipNonMusic,
          download: request.download,
          timeoutMs: request.timeoutMs
        },
        /* The agent answers only after yt-dlp finishes, so the socket is idle
         * for the length of the download; the agent's own timeout is the bound. */
        timeoutMs: request.timeoutMs + 60_000
      }));
    } catch {
      throw new EgressStreamError();
    }

    if (status !== 200) {
      const body = await readSmallBody(response);
      const error = isRecord(body) ? body.error : null;

      if (status === 410) {
        throw new YoutubeVideoUnavailableError(request.videoId);
      }

      /* A switch killed this download: the claim returns to pending. */
      if (status === 503) {
        throw new EgressStreamError();
      }

      if (status === 502 && error === 'sponsorblock') {
        throw new YoutubeSponsorBlockError(request.videoId);
      }

      if (status === 502) {
        throw new EgressSourceUnavailableError(
          failureOf(isRecord(body) ? body.reason : null)
        );
      }

      throw new AgentResponseError(status);
    }

    const extension = response.headers['x-source-extension'];

    if (typeof extension !== 'string' || !/^[a-z0-9]+$/.test(extension)) {
      response.destroy();
      throw new Error('The egress agent did not name the source format.');
    }

    const filePath = join(request.tempDir, `${request.videoId}.${extension}`);

    try {
      await pipeline(response, createWriteStream(filePath));
    } catch {
      await rm(filePath, { force: true });
      throw new EgressStreamError();
    }

    return { videoId: request.videoId, filePath };
  }
}
