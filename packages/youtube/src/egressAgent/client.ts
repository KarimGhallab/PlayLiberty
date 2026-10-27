import { createWriteStream } from 'node:fs';
import { mkdir, rm } from 'node:fs/promises';
import type { IncomingMessage } from 'node:http';
import { request } from 'node:http';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';

import {
  EgressSourceUnavailableError,
  FailureDisposition,
  SourceFailureError,
  YoutubeSponsorBlockError,
  YoutubeVideoUnavailableError
} from '../errors/errors.js';
import type { FailureMeaning } from '../errors/errors.js';
import type {
  AgentFetchRequest,
  EgressAgentStatus,
  EgressCheckFacts,
  FetchedTrack,
  IEgressAgentClient,
  YoutubeSource
} from '../types.js';
import { SourceFailureKind } from '../types.js';
import {
  AgentErrorCode,
  AgentHeader,
  AgentHttpStatus,
  AgentMethod,
  AgentRoute,
  applyBody,
  decodeReply,
  fetchBody,
  listBody,
  parseAgentStatus,
  parseCheckFacts,
  parseSourceExtension,
  parseYoutubeSource,
  switchBody
} from './protocol.js';
import type { AgentWireReply, DecodedReply } from './protocol.js';

/* The read may not hang on a wedged agent: "unreachable" is an answer the page
 * can draw faster than a person gives up. A switch or a check is a yt-dlp run,
 * so it gets the room one takes. */
const STATUS_TIMEOUT_MS = 2000;
const LIST_TIMEOUT_MS = 120_000;

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

/* A transport failure is neither the track's nor the exit's: the claim goes
 * back to pending and nothing counts. */
function interruptedFailure(sentence: string): FailureMeaning {
  return {
    kind: SourceFailureKind.Unknown,
    disposition: FailureDisposition.Interrupted,
    sentence
  };
}

/* The socket or the stream died mid-download. Not the track's fault: the claim
 * goes back to pending instead of becoming a failed row. */
export class EgressStreamError extends SourceFailureError {
  public readonly failure: FailureMeaning = interruptedFailure(
    'The egress agent did not finish the download.'
  );

  constructor() {
    super('The egress agent did not finish the download.');
    this.name = 'EgressStreamError';
  }
}

/* A rotation drained this read. It is not an exit failure, so it must not
 * count; the next pass starts on the config that is now loaded. */
export class EgressSwitchError extends SourceFailureError {
  public readonly failure: FailureMeaning = interruptedFailure(
    'The exit switched while the source was being read.'
  );

  constructor() {
    super('The exit switched while the source was being read.');
    this.name = 'EgressSwitchError';
  }
}

/* The agent was asked to switch and could not. The active row is unchanged. */
export class EgressSwitchFailedError extends SourceFailureError {
  public readonly failure: FailureMeaning;

  constructor(message: string) {
    super(message);
    this.name = 'EgressSwitchFailedError';
    this.failure = interruptedFailure(message);
  }
}

function switchFailureOf(detail: string | null): EgressSwitchFailedError {
  return new EgressSwitchFailedError(
    detail !== null && detail.length > 0
      ? detail
      : 'The exit could not be switched.'
  );
}

/* A reply this route does not name is the agent failing, not an answer the
 * caller can act on. */
class AgentResponseError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`The egress agent answered ${String(status)}.`);
    this.name = 'AgentResponseError';
    this.status = status;
  }
}

function expectOk(reply: DecodedReply): unknown {
  if (reply.outcome !== 'ok') {
    throw new AgentResponseError(reply.status);
  }

  return reply.body;
}

interface AgentRequest {
  socketPath: string;
  method: AgentMethod;
  path: AgentRoute;
  body?: unknown;
  timeoutMs: number;
}

function requestJson(options: AgentRequest): Promise<AgentWireReply> {
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
    const reply = decodeReply(
      await requestJson({
        socketPath: this._socketPath,
        method: AgentMethod.Get,
        path: AgentRoute.Status,
        timeoutMs: STATUS_TIMEOUT_MS
      })
    );

    return parseAgentStatus(expectOk(reply));
  }

  public async switch(name?: string): Promise<EgressCheckFacts> {
    const reply = decodeReply(
      await requestJson({
        socketPath: this._socketPath,
        method: AgentMethod.Post,
        path: AgentRoute.Switch,
        body: switchBody(name),
        timeoutMs: LIST_TIMEOUT_MS
      })
    );

    switch (reply.outcome) {
      case 'ok':
        return parseCheckFacts(reply.body);
      case AgentErrorCode.UnknownConfig:
        throw new EgressConfigUnknownError(name ?? 'unknown');
      case AgentErrorCode.SwitchFailed:
        throw switchFailureOf(reply.detail);
      default:
        throw new AgentResponseError(reply.status);
    }
  }

  public async check(): Promise<EgressCheckFacts> {
    const reply = decodeReply(
      await requestJson({
        socketPath: this._socketPath,
        method: AgentMethod.Post,
        path: AgentRoute.Check,
        timeoutMs: LIST_TIMEOUT_MS
      })
    );

    return parseCheckFacts(expectOk(reply));
  }

  public async list(url: string): Promise<YoutubeSource> {
    const reply = decodeReply(
      await requestJson({
        socketPath: this._socketPath,
        method: AgentMethod.Post,
        path: AgentRoute.List,
        body: listBody(url),
        timeoutMs: LIST_TIMEOUT_MS
      })
    );

    switch (reply.outcome) {
      case 'ok':
        return parseYoutubeSource(reply.body);
      case AgentErrorCode.InvalidSource:
        throw new EgressSourceInvalidError();
      case AgentErrorCode.Switching:
        throw new EgressSwitchError();
      case AgentErrorCode.SourceUnavailable:
        throw new EgressSourceUnavailableError(reply.reason);
      default:
        throw new AgentResponseError(reply.status);
    }
  }

  public async applyConfig(
    name: string,
    drainTimeoutMs: number
  ): Promise<EgressAgentStatus> {
    const reply = decodeReply(
      await requestJson({
        socketPath: this._socketPath,
        method: AgentMethod.Post,
        path: AgentRoute.Apply,
        body: applyBody(name, drainTimeoutMs),
        /* The drain runs before the agent answers, so the wait is the bound. */
        timeoutMs: drainTimeoutMs + 30_000
      })
    );

    switch (reply.outcome) {
      case 'ok':
        return parseAgentStatus(reply.body);
      case AgentErrorCode.UnknownConfig:
        throw new EgressConfigUnknownError(name);
      case AgentErrorCode.SwitchFailed:
        throw switchFailureOf(reply.detail);
      default:
        throw new AgentResponseError(reply.status);
    }
  }

  public async fetchTrack(request: AgentFetchRequest): Promise<FetchedTrack> {
    await mkdir(request.tempDir, { recursive: true });

    let response: IncomingMessage;
    let status: number;

    try {
      ({ status, response } = await requestStream({
        socketPath: this._socketPath,
        method: AgentMethod.Post,
        path: AgentRoute.Fetch,
        body: fetchBody(request),
        /* The agent answers only after yt-dlp finishes, so the socket is idle
         * for the length of the download; the agent's own timeout is the bound. */
        timeoutMs: request.timeoutMs + 60_000
      }));
    } catch {
      throw new EgressStreamError();
    }

    if (status !== AgentHttpStatus.Ok) {
      const reply = decodeReply({
        status,
        body: await readSmallBody(response)
      });

      switch (reply.outcome) {
        case AgentErrorCode.Unavailable:
          throw new YoutubeVideoUnavailableError(request.videoId);
        /* A switch killed this download: the claim returns to pending. */
        case AgentErrorCode.Switching:
          throw new EgressStreamError();
        case AgentErrorCode.SponsorBlock:
          throw new YoutubeSponsorBlockError(request.videoId);
        case AgentErrorCode.SourceUnavailable:
          throw new EgressSourceUnavailableError(reply.reason);
        default:
          throw new AgentResponseError(reply.status);
      }
    }

    const extension = parseSourceExtension(
      response.headers[AgentHeader.SourceExtension]
    );

    if (extension === null) {
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
