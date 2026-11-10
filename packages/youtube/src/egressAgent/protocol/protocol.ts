import type {
  AgentFetchRequest,
  DownloadOptions,
  EgressAgentStatus,
  EgressCheckFacts,
  YoutubeSource,
  YoutubeSourceEntry
} from '../../types.js';
import { SourceFailureKind, YoutubeSourceKind } from '../../types.js';
import { isValidVideoId } from '../../validateYoutubeUrl/validateYoutubeUrl.js';

/* The one description of the agent socket: the agent writes replies through
 * `wireReply`, the client decodes them through `decodeReply`, and neither
 * writes a status code or body field by hand. */

export enum AgentMethod {
  Get = 'GET',
  Post = 'POST'
}

export enum AgentRoute {
  Status = '/status',
  Switch = '/switch',
  Check = '/check',
  List = '/list',
  Apply = '/apply',
  Fetch = '/fetch'
}

export enum AgentHeader {
  SourceExtension = 'x-source-extension'
}

export enum AgentHttpStatus {
  Ok = 200,
  BadRequest = 400,
  NotFound = 404,
  Gone = 410,
  Internal = 500,
  SourceFailure = 502,
  Refused = 503
}

export enum AgentErrorCode {
  InvalidRequest = 'invalid_request',
  UnknownConfig = 'unknown_config',
  SwitchFailed = 'switch_failed',
  InvalidSource = 'invalid_source',
  SourceUnavailable = 'source_unavailable',
  Switching = 'switching',
  Unavailable = 'unavailable',
  SponsorBlock = 'sponsorblock',
  Internal = 'internal',
  NotFound = 'not_found'
}

/* One row per error, so the status an end writes is the status the other
 * checks. A new error is a compile error at both the wire and the decoder. */
const ERROR_STATUSES: Record<AgentErrorCode, AgentHttpStatus> = {
  [AgentErrorCode.InvalidRequest]: AgentHttpStatus.BadRequest,
  [AgentErrorCode.UnknownConfig]: AgentHttpStatus.BadRequest,
  [AgentErrorCode.SwitchFailed]: AgentHttpStatus.Refused,
  [AgentErrorCode.InvalidSource]: AgentHttpStatus.BadRequest,
  [AgentErrorCode.SourceUnavailable]: AgentHttpStatus.SourceFailure,
  [AgentErrorCode.Switching]: AgentHttpStatus.Refused,
  [AgentErrorCode.Unavailable]: AgentHttpStatus.Gone,
  [AgentErrorCode.SponsorBlock]: AgentHttpStatus.SourceFailure,
  [AgentErrorCode.Internal]: AgentHttpStatus.Internal,
  [AgentErrorCode.NotFound]: AgentHttpStatus.NotFound
};

export type AgentReply =
  | { outcome: 'ok'; body: unknown }
  | { outcome: AgentErrorCode.InvalidRequest }
  | { outcome: AgentErrorCode.UnknownConfig }
  | { outcome: AgentErrorCode.SwitchFailed; detail: string }
  | { outcome: AgentErrorCode.InvalidSource }
  | { outcome: AgentErrorCode.SourceUnavailable; reason: SourceFailureKind }
  | { outcome: AgentErrorCode.Switching }
  | { outcome: AgentErrorCode.Unavailable }
  | { outcome: AgentErrorCode.SponsorBlock }
  | { outcome: AgentErrorCode.Internal }
  | { outcome: AgentErrorCode.NotFound };

export type DecodedReply =
  | { outcome: 'ok'; status: number; body: unknown }
  | { outcome: AgentErrorCode.InvalidRequest; status: number }
  | { outcome: AgentErrorCode.UnknownConfig; status: number }
  | {
      outcome: AgentErrorCode.SwitchFailed;
      status: number;
      detail: string | null;
    }
  | { outcome: AgentErrorCode.InvalidSource; status: number }
  | {
      outcome: AgentErrorCode.SourceUnavailable;
      status: number;
      reason: SourceFailureKind;
    }
  | { outcome: AgentErrorCode.Switching; status: number }
  | { outcome: AgentErrorCode.Unavailable; status: number }
  | { outcome: AgentErrorCode.SponsorBlock; status: number }
  | { outcome: AgentErrorCode.Internal; status: number }
  | { outcome: AgentErrorCode.NotFound; status: number }
  | { outcome: 'unexpected'; status: number };

export interface AgentWireReply {
  status: number;
  body: unknown;
}

export function wireReply(reply: AgentReply): AgentWireReply {
  if (reply.outcome === 'ok') {
    return { status: AgentHttpStatus.Ok, body: reply.body };
  }

  return {
    status: ERROR_STATUSES[reply.outcome],
    body: errorBody(reply)
  };
}

function errorBody(reply: Exclude<AgentReply, { outcome: 'ok' }>): unknown {
  switch (reply.outcome) {
    case AgentErrorCode.SwitchFailed:
      return { error: reply.outcome, detail: reply.detail };
    case AgentErrorCode.SourceUnavailable:
      return { error: reply.outcome, reason: reply.reason };
    default:
      return { error: reply.outcome };
  }
}

export function decodeReply(reply: AgentWireReply): DecodedReply {
  if (reply.status === AgentHttpStatus.Ok) {
    return { outcome: 'ok', status: reply.status, body: reply.body };
  }

  const code = errorCodeOf(reply.body);

  if (code === null || ERROR_STATUSES[code] !== reply.status) {
    return { outcome: 'unexpected', status: reply.status };
  }

  switch (code) {
    case AgentErrorCode.SwitchFailed:
      return {
        outcome: code,
        status: reply.status,
        detail: detailOf(reply.body)
      };
    case AgentErrorCode.SourceUnavailable:
      return {
        outcome: code,
        status: reply.status,
        reason: sourceFailureKindOf(reply.body)
      };
    default:
      return { outcome: code, status: reply.status };
  }
}

export interface SwitchBody {
  name?: string;
}

export interface ListBody {
  url: string;
}

export interface ApplyBody {
  name: string;
  drainTimeoutMs?: number;
}

export type FetchBody = Omit<AgentFetchRequest, 'tempDir'>;

export function switchBody(name?: string): SwitchBody {
  return name === undefined ? {} : { name };
}

export function listBody(url: string): ListBody {
  return { url };
}

export function applyBody(name: string, drainTimeoutMs: number): ApplyBody {
  return { name, drainTimeoutMs };
}

export function fetchBody(request: AgentFetchRequest): FetchBody {
  return {
    videoId: request.videoId,
    skipNonMusic: request.skipNonMusic,
    download: request.download,
    timeoutMs: request.timeoutMs
  };
}

export function parseSwitchBody(value: unknown): SwitchBody | null {
  if (!isRecord(value)) {
    return null;
  }

  if (value.name === undefined) {
    return {};
  }

  return typeof value.name === 'string' && value.name.length > 0
    ? { name: value.name }
    : null;
}

export function parseListBody(value: unknown): ListBody | null {
  return isRecord(value) &&
    typeof value.url === 'string' &&
    value.url.length > 0
    ? { url: value.url }
    : null;
}

export function parseApplyBody(value: unknown): ApplyBody | null {
  if (
    !isRecord(value) ||
    typeof value.name !== 'string' ||
    value.name.length === 0 ||
    (value.drainTimeoutMs !== undefined &&
      (typeof value.drainTimeoutMs !== 'number' ||
        !Number.isInteger(value.drainTimeoutMs) ||
        value.drainTimeoutMs <= 0))
  ) {
    return null;
  }

  return {
    name: value.name,
    ...(typeof value.drainTimeoutMs === 'number'
      ? { drainTimeoutMs: value.drainTimeoutMs }
      : {})
  };
}

export function parseFetchBody(value: unknown): FetchBody | null {
  if (
    !isRecord(value) ||
    typeof value.videoId !== 'string' ||
    !isValidVideoId(value.videoId) ||
    typeof value.skipNonMusic !== 'boolean' ||
    typeof value.timeoutMs !== 'number' ||
    !Number.isInteger(value.timeoutMs) ||
    value.timeoutMs <= 0 ||
    !isDownloadOptions(value.download)
  ) {
    return null;
  }

  return {
    videoId: value.videoId,
    skipNonMusic: value.skipNonMusic,
    timeoutMs: value.timeoutMs,
    download: value.download
  };
}

export function parseSourceExtension(value: unknown): string | null {
  return typeof value === 'string' && /^[a-z0-9]+$/.test(value) ? value : null;
}

/* Every option the server sends, so a new field cannot be dropped by the wire
 * parser without failing the record it is declared against. */
const DOWNLOAD_OPTION_TYPES = {
  concurrency: 'number',
  sleepRequests: 'number',
  sleepIntervalMin: 'number',
  sleepIntervalMax: 'number',
  limitRate: 'string',
  retries: 'number',
  fragmentRetries: 'number',
  fileAccessRetries: 'number',
  socketTimeout: 'number'
} as const satisfies Record<keyof DownloadOptions, 'number' | 'string'>;

function isDownloadOptions(value: unknown): value is DownloadOptions {
  if (!isRecord(value)) {
    return false;
  }

  for (const [field, kind] of Object.entries(DOWNLOAD_OPTION_TYPES)) {
    if (typeof value[field] !== kind) {
      return false;
    }
  }

  return typeof value.limitRate === 'string' && value.limitRate.length > 0;
}

export function parseAgentStatus(value: unknown): EgressAgentStatus {
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

export function parseCheckFacts(value: unknown): EgressCheckFacts {
  if (
    !isRecord(value) ||
    typeof value.listing !== 'boolean' ||
    (value.handshake !== null && typeof value.handshake !== 'boolean') ||
    (value.failure !== null &&
      (typeof value.failure !== 'string' ||
        !isSourceFailureKind(value.failure)))
  ) {
    throw new Error('The egress agent answered an unexpected check result.');
  }

  return {
    handshake: value.handshake as boolean | null,
    listing: value.listing,
    exitIp: optionalString(value.exitIp, 'exit address'),
    failure: value.failure as SourceFailureKind | null,
    active: optionalString(value.active, 'active config')
  };
}

export function parseYoutubeSource(value: unknown): YoutubeSource {
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

function parseEntry(value: unknown): YoutubeSourceEntry {
  if (
    !isRecord(value) ||
    typeof value.videoId !== 'string' ||
    !isValidVideoId(value.videoId) ||
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

function errorCodeOf(body: unknown): AgentErrorCode | null {
  if (!isRecord(body) || typeof body.error !== 'string') {
    return null;
  }

  return isAgentErrorCode(body.error) ? body.error : null;
}

function detailOf(body: unknown): string | null {
  if (!isRecord(body) || typeof body.detail !== 'string') {
    return null;
  }

  return body.detail.length > 0 ? body.detail : null;
}

function sourceFailureKindOf(body: unknown): SourceFailureKind {
  if (!isRecord(body) || typeof body.reason !== 'string') {
    return SourceFailureKind.Unknown;
  }

  return isSourceFailureKind(body.reason)
    ? body.reason
    : SourceFailureKind.Unknown;
}

const ERROR_CODES: ReadonlySet<string> = new Set(Object.values(AgentErrorCode));

function isAgentErrorCode(value: string): value is AgentErrorCode {
  return ERROR_CODES.has(value);
}

const FAILURES: ReadonlySet<string> = new Set(Object.values(SourceFailureKind));

function isSourceFailureKind(value: string): value is SourceFailureKind {
  return FAILURES.has(value);
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
