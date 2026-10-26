import { ProblemCode } from './enums.js';
import {
  AccountSchema,
  AccountSummaryPageSchema,
  AddTrackResultSchema,
  EgressReadSchema,
  PlaylistPageSchema,
  PlaylistSchema,
  PlaylistTrackListSchema,
  PlaylistTracksPageSchema,
  ShareListSchema,
  ShareSchema,
  SyncRunSchema,
  TrackSchema
} from './schemas.js';

export enum HttpMethod {
  Get = 'GET',
  Post = 'POST',
  Patch = 'PATCH',
  Delete = 'DELETE'
}

export type EndpointParams = Readonly<Record<string, string>>;

/* The part of a response schema both ends read, without depending on Zod. */
export interface ResponseReader<T> {
  readonly parse: (input: unknown) => T;
}

/* What every declaration carries, whichever body it answers: the server
 * registrar binds a route from the method and the path alone. */
export interface EndpointDeclaration {
  readonly method: HttpMethod;
  readonly path: string;
  readonly errors: readonly ProblemCode[];
}

/* One endpoint, one declaration: the query module reads it to send, the mock
 * harness reads it to answer, and neither writes the path. */
export interface ApiEndpoint<TResponse> extends EndpointDeclaration {
  readonly response: ResponseReader<TResponse>;
}

/* A command whose success carries no body, so there is no response to parse. */
export type ApiCommandEndpoint = EndpointDeclaration;

/* A media route a browser element reads whole: the declaration carries its
 * method and path, and the element reads the body without a schema. */
export type ApiMediaEndpoint = EndpointDeclaration;

export function defineEndpoint<TResponse>(
  endpoint: ApiEndpoint<TResponse>
): ApiEndpoint<TResponse> {
  return endpoint;
}

export function defineCommandEndpoint(
  endpoint: ApiCommandEndpoint
): ApiCommandEndpoint {
  return endpoint;
}

export function defineMediaEndpoint(
  endpoint: ApiMediaEndpoint
): ApiMediaEndpoint {
  return endpoint;
}

const PATH_PARAMETER = /:([A-Za-z0-9_]+)/g;

/* Substitutes every declared parameter. A missing one is a programming error,
 * not an empty segment: a path with a hole would hit an unrelated route. */
export function endpointPath(path: string, params: EndpointParams): string {
  return path.replace(PATH_PARAMETER, (_match: string, name: string) => {
    const value = params[name];

    if (value === undefined) {
      throw new Error(`Missing path parameter "${name}" for ${path}`);
    }

    return encodeURIComponent(value);
  });
}

/* Substitutes only the parameters supplied, leaving the rest as `:name`, the
 * pattern a mock handler matches. */
export function endpointPattern(path: string, params: EndpointParams): string {
  return path.replace(PATH_PARAMETER, (match: string, name: string) => {
    const value = params[name];

    return value === undefined ? match : encodeURIComponent(value);
  });
}

const READ_ERRORS: readonly ProblemCode[] = [
  ProblemCode.Unauthenticated,
  ProblemCode.InternalError
];

const REQUEST_ERRORS: readonly ProblemCode[] = [
  ...READ_ERRORS,
  ProblemCode.RequestError
];

const CSRF_ERRORS: readonly ProblemCode[] = [
  ProblemCode.CsrfHeaderMissing,
  ProblemCode.CsrfCrossSite,
  ProblemCode.CsrfOriginMismatch
];

const WRITE_ERRORS: readonly ProblemCode[] = [
  ...REQUEST_ERRORS,
  ...CSRF_ERRORS
];

const VALIDATED_WRITE_ERRORS: readonly ProblemCode[] = [
  ProblemCode.ValidationFailed,
  ...WRITE_ERRORS
];

export const endpoints = {
  playlists: defineEndpoint({
    method: HttpMethod.Get,
    path: '/playlists',
    response: PlaylistPageSchema,
    errors: [ProblemCode.ValidationFailed, ...READ_ERRORS]
  }),
  accounts: defineEndpoint({
    method: HttpMethod.Get,
    path: '/accounts',
    response: AccountSummaryPageSchema,
    errors: [ProblemCode.ValidationFailed, ...READ_ERRORS]
  }),
  currentAccount: defineEndpoint({
    method: HttpMethod.Get,
    path: '/me',
    response: AccountSchema,
    errors: READ_ERRORS
  }),
  /* The caller's own role is part of the account read, so the client can gate
   * an admin surface without asking a second route. */
  egress: defineEndpoint({
    method: HttpMethod.Get,
    path: '/egress',
    response: EgressReadSchema,
    errors: [ProblemCode.NotFound, ...READ_ERRORS]
  }),
  probeEgress: defineEndpoint({
    method: HttpMethod.Post,
    path: '/egress/:name/probe',
    response: EgressReadSchema,
    errors: [ProblemCode.NotFound, ...WRITE_ERRORS]
  }),
  switchEgress: defineEndpoint({
    method: HttpMethod.Post,
    path: '/egress/:name/switch',
    response: EgressReadSchema,
    errors: [
      ProblemCode.NotFound,
      ProblemCode.EgressSwitchFailed,
      ...WRITE_ERRORS
    ]
  }),
  createPlaylist: defineEndpoint({
    method: HttpMethod.Post,
    path: '/playlists',
    response: SyncRunSchema,
    errors: [
      ...VALIDATED_WRITE_ERRORS,
      ProblemCode.InvalidRequest,
      ProblemCode.SyncAlreadyRunning
    ]
  }),
  addTrack: defineEndpoint({
    method: HttpMethod.Post,
    path: '/tracks',
    response: AddTrackResultSchema,
    errors: [...VALIDATED_WRITE_ERRORS, ProblemCode.UnprocessableRequest]
  }),
  playlistTracks: defineEndpoint({
    method: HttpMethod.Get,
    path: '/playlists/:playlistId/tracks',
    response: PlaylistTracksPageSchema,
    errors: [
      ProblemCode.ValidationFailed,
      ProblemCode.PlaylistNotFound,
      ...READ_ERRORS
    ]
  }),
  playlistQueue: defineEndpoint({
    method: HttpMethod.Get,
    path: '/playlists/:playlistId/queue',
    response: PlaylistTrackListSchema,
    errors: [ProblemCode.PlaylistNotFound, ...READ_ERRORS]
  }),
  playlist: defineEndpoint({
    method: HttpMethod.Get,
    path: '/playlists/:playlistId',
    response: PlaylistSchema,
    errors: [ProblemCode.PlaylistNotFound, ...READ_ERRORS]
  }),
  setPlaylistCover: defineEndpoint({
    method: HttpMethod.Post,
    path: '/playlists/:playlistId/cover',
    response: PlaylistSchema,
    errors: [
      ProblemCode.PlaylistNotFound,
      ProblemCode.UnprocessableRequest,
      ...WRITE_ERRORS
    ]
  }),
  playlistCover: defineMediaEndpoint({
    method: HttpMethod.Get,
    path: '/playlists/:playlistId/cover',
    errors: [
      ProblemCode.PlaylistNotFound,
      ProblemCode.CoverNotFound,
      ...READ_ERRORS
    ]
  }),
  removePlaylistCover: defineCommandEndpoint({
    method: HttpMethod.Delete,
    path: '/playlists/:playlistId/cover',
    errors: [ProblemCode.PlaylistNotFound, ...WRITE_ERRORS]
  }),
  latestSyncRun: defineEndpoint({
    method: HttpMethod.Get,
    path: '/playlists/:playlistId/sync-runs/latest',
    response: SyncRunSchema,
    errors: [
      ProblemCode.PlaylistNotFound,
      ProblemCode.SyncRunAbsent,
      ...READ_ERRORS
    ]
  }),
  syncPlaylist: defineEndpoint({
    method: HttpMethod.Post,
    path: '/playlists/:playlistId/sync',
    response: SyncRunSchema,
    errors: [
      ProblemCode.PlaylistNotFound,
      ProblemCode.SyncAlreadyRunning,
      ...WRITE_ERRORS
    ]
  }),
  renamePlaylist: defineEndpoint({
    method: HttpMethod.Patch,
    path: '/playlists/:playlistId',
    response: PlaylistSchema,
    errors: [ProblemCode.PlaylistNotFound, ...VALIDATED_WRITE_ERRORS]
  }),
  skipNonMusic: defineEndpoint({
    method: HttpMethod.Patch,
    path: '/playlists/:playlistId/skip-non-music',
    response: PlaylistSchema,
    errors: [ProblemCode.PlaylistNotFound, ...VALIDATED_WRITE_ERRORS]
  }),
  sortPlaylist: defineEndpoint({
    method: HttpMethod.Patch,
    path: '/playlists/:playlistId/sort',
    response: PlaylistSchema,
    errors: [ProblemCode.PlaylistNotFound, ...VALIDATED_WRITE_ERRORS]
  }),
  pinPlaylist: defineEndpoint({
    method: HttpMethod.Patch,
    path: '/playlists/:playlistId/pin',
    response: PlaylistSchema,
    errors: [ProblemCode.PlaylistNotFound, ...VALIDATED_WRITE_ERRORS]
  }),
  deletePlaylist: defineCommandEndpoint({
    method: HttpMethod.Delete,
    path: '/playlists/:playlistId',
    errors: [ProblemCode.PlaylistNotFound, ...WRITE_ERRORS]
  }),
  retryTrack: defineEndpoint({
    method: HttpMethod.Post,
    path: '/tracks/:trackId/retry',
    response: TrackSchema,
    errors: [
      ProblemCode.TrackNotFound,
      ProblemCode.TrackNotRetryable,
      ...WRITE_ERRORS
    ]
  }),
  fetchTrackWhole: defineEndpoint({
    method: HttpMethod.Post,
    path: '/tracks/:trackId/fetch-whole',
    response: TrackSchema,
    errors: [
      ProblemCode.TrackNotFound,
      ProblemCode.TrackNotFetchable,
      ...WRITE_ERRORS
    ]
  }),
  trackStream: defineMediaEndpoint({
    method: HttpMethod.Get,
    path: '/tracks/:trackId/stream',
    errors: [
      ProblemCode.TrackNotFound,
      ProblemCode.Forbidden,
      ProblemCode.TrackNotStored,
      ...READ_ERRORS
    ]
  }),
  trackThumbnail: defineMediaEndpoint({
    method: HttpMethod.Get,
    path: '/tracks/:trackId/thumbnail',
    errors: [
      ProblemCode.ThumbnailNotFound,
      ProblemCode.Forbidden,
      ...READ_ERRORS
    ]
  }),
  removeTrack: defineCommandEndpoint({
    method: HttpMethod.Delete,
    path: '/playlists/:playlistId/tracks/:trackId',
    errors: [ProblemCode.PlaylistNotFound, ...WRITE_ERRORS]
  }),
  playlistShares: defineEndpoint({
    method: HttpMethod.Get,
    path: '/playlists/:playlistId/shares',
    response: ShareListSchema,
    errors: [ProblemCode.PlaylistNotFound, ...READ_ERRORS]
  }),
  grantShare: defineEndpoint({
    method: HttpMethod.Post,
    path: '/playlists/:playlistId/shares',
    response: ShareSchema,
    errors: [
      ProblemCode.PlaylistNotFound,
      ProblemCode.AccountNotFound,
      ProblemCode.SelfShare,
      ...VALIDATED_WRITE_ERRORS
    ]
  }),
  revokeShare: defineCommandEndpoint({
    method: HttpMethod.Delete,
    path: '/playlists/:playlistId/shares/:accountId',
    errors: [ProblemCode.PlaylistNotFound, ...WRITE_ERRORS]
  })
};
