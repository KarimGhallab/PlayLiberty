import { HttpResponse, http } from 'msw';
import type { HttpHandler, HttpResponseResolver } from 'msw';

import {
  AddTrackOutcome,
  AssociationOrigin,
  HttpMethod,
  PinPlaylistInputSchema,
  PlaylistSort,
  PlaylistSyncStatus,
  ProblemCode,
  Provider,
  ShareLevel,
  SkipNonMusicInputSchema,
  SortPlaylistInputSchema,
  SyncRunStatus,
  TrackFileStatus,
  TrackSourceStatus,
  endpointPattern,
  endpoints
} from '@playliberty/contracts';
import type {
  AccountSummary,
  AccountSummaryPage,
  AddTrackResult,
  EndpointParams,
  Playlist,
  PlaylistPage,
  PlaylistTrack,
  PlaylistTracksPage,
  Problem,
  Share,
  SyncRun,
  Track,
  TrackFileStatusCounts
} from '@playliberty/contracts';

import { API_PREFIX } from '../../shared/api/client/client';

/*
 * The harness the tests run against: two valid playlists, one owned and one
 * shared, in the route's order, so a component test also exercises schema
 * parsing, ordering and both access levels.
 */

/* Every state is a key including a zero, so the chips have one to draw. */
export const EMPTY_COUNTS: TrackFileStatusCounts = {
  [TrackFileStatus.Stored]: 0,
  [TrackFileStatus.Pending]: 0,
  [TrackFileStatus.Downloading]: 0,
  [TrackFileStatus.Failed]: 0,
  [TrackFileStatus.Unavailable]: 0
};

interface CountedAssociation {
  readonly track: { readonly fileStatus: TrackFileStatus };
}

export function countsOf(
  tracks: readonly CountedAssociation[]
): TrackFileStatusCounts {
  const counts: TrackFileStatusCounts = { ...EMPTY_COUNTS };

  for (const association of tracks) {
    counts[association.track.fileStatus] += 1;
  }

  return counts;
}

/* The declaration carries the method and the path; a supplied parameter is
 * concrete, an omitted one stays the pattern MSW matches. */
export function mockUrl(
  endpoint: { readonly path: string },
  params: EndpointParams = {}
): string {
  return `${API_PREFIX}${endpointPattern(endpoint.path, params)}`;
}

export function mockEndpoint(
  endpoint: { readonly method: HttpMethod; readonly path: string },
  resolver: HttpResponseResolver,
  params: EndpointParams = {}
): HttpHandler {
  const url = mockUrl(endpoint, params);

  switch (endpoint.method) {
    case HttpMethod.Get:
      return http.get(url, resolver);
    case HttpMethod.Post:
      return http.post(url, resolver);
    case HttpMethod.Patch:
      return http.patch(url, resolver);
    case HttpMethod.Delete:
      return http.delete(url, resolver);
    default:
      throw new Error(`The harness cannot mock ${endpoint.method}.`);
  }
}

/* A fixture is parsed by the endpoint's own schema, so a shape the contract
 * does not know fails here rather than reaching a component. */
export function respond<TResponse>(
  endpoint: { readonly response: { parse: (input: unknown) => TResponse } },
  body: TResponse,
  status = 200
): HttpResponse<string> {
  endpoint.response.parse(body);

  return jsonResponse(body, status);
}

export interface ProblemFixture {
  readonly code: ProblemCode;
  readonly status: number;
  readonly title: string;
  readonly detail?: string;
  readonly params?: Problem['params'];
}

export function problemResponse(fixture: ProblemFixture): HttpResponse<string> {
  const problem: Problem = {
    type: 'about:blank',
    title: fixture.title,
    status: fixture.status,
    code: fixture.code,
    detail: fixture.detail,
    params: fixture.params
  };

  return jsonResponse(problem, fixture.status);
}

function jsonResponse(body: unknown, status: number): HttpResponse<string> {
  return new HttpResponse(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

/* Two stored and one pending, so a test has a playable track and one that is
 * not yet playable to tell apart; the queue route returns them whole. */
const TRACK_ONE: Track = {
  id: 'track-1',
  provider: Provider.Youtube,
  videoId: 'video-1',
  title: 'Blue In Green',
  durationSeconds: 337,
  skipNonMusic: true,
  thumbnailPath: null,
  fileStatus: TrackFileStatus.Stored,
  sourceStatus: TrackSourceStatus.Available,
  failureReason: null,
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-29T12:00:00.000Z'
};

const TRACK_TWO: Track = {
  ...TRACK_ONE,
  id: 'track-2',
  videoId: 'video-2',
  title: 'Naima',
  durationSeconds: 273
};

const TRACK_THREE: Track = {
  ...TRACK_ONE,
  id: 'track-3',
  videoId: 'video-3',
  title: 'Flamenco Sketches',
  durationSeconds: 565,
  fileStatus: TrackFileStatus.Pending
};

const PLAYLIST_ONE_TRACKS: PlaylistTrack[] = [
  { track: TRACK_ONE, origin: AssociationOrigin.Remote, position: 0 },
  { track: TRACK_TWO, origin: AssociationOrigin.Remote, position: 1 },
  { track: TRACK_THREE, origin: AssociationOrigin.Remote, position: 2 }
];

const PLAYLIST_ONE: Playlist = {
  id: 'playlist-1',
  ownerAccountId: 'account-1',
  name: 'Rain On The Window',
  coverTrackId: null,
  provider: Provider.Youtube,
  sourcePlaylistId: 'PL-demo',
  syncStatus: PlaylistSyncStatus.Idle,
  lastSyncedAt: '2026-09-29T12:00:00.000Z',
  trackCount: 3,
  skipNonMusic: true,
  sort: PlaylistSort.Playlist,
  access: 'owner',
  hasShares: false,
  pinned: false,
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-29T12:00:00.000Z'
};

const PLAYLIST_TWO: Playlist = {
  ...PLAYLIST_ONE,
  id: 'playlist-2',
  ownerAccountId: 'account-2',
  name: 'Shared Mix',
  sourcePlaylistId: 'PL-shared',
  lastSyncedAt: '2026-09-28T12:00:00.000Z',
  trackCount: 4,
  access: ShareLevel.Read,
  updatedAt: '2026-09-28T12:00:00.000Z'
};

const ACCOUNT_ONE: AccountSummary = {
  id: 'account-1',
  displayName: 'You',
  avatarUrl: null
};

const ACCOUNT_TWO: AccountSummary = {
  id: 'account-2',
  displayName: 'Ada',
  avatarUrl: null
};

const PLAYLIST_PAGE: PlaylistPage = {
  items: [
    {
      ...PLAYLIST_ONE,
      trackCount: 1,
      counts: { ...EMPTY_COUNTS, [TrackFileStatus.Stored]: 1 }
    },
    {
      ...PLAYLIST_TWO,
      counts: { ...EMPTY_COUNTS, [TrackFileStatus.Stored]: 4 }
    }
  ],
  total: 2,
  limit: 50,
  offset: 0
};

/* Both owners are present: the shared item resolves to Ada, and the owned
 * item's owner resolves but is never drawn, the header's own rule. */
const ACCOUNT_PAGE: AccountSummaryPage = {
  items: [ACCOUNT_ONE, ACCOUNT_TWO],
  total: 2,
  limit: 50,
  offset: 0
};

/* Completed, so the detail draws the summary rather than the error. */
const LATEST_RUN: SyncRun = {
  id: 'run-1',
  playlistId: 'playlist-1',
  status: SyncRunStatus.Completed,
  addedCount: 3,
  retainedCount: 128,
  removedCount: 1,
  failedCount: 2,
  startedAt: '2026-09-29T11:59:00.000Z',
  finishedAt: '2026-09-29T12:00:00.000Z',
  error: null
};

const STARTED_RUN: SyncRun = {
  id: 'run-sync',
  playlistId: 'playlist-1',
  status: SyncRunStatus.Running,
  addedCount: 0,
  retainedCount: 0,
  removedCount: 0,
  failedCount: 0,
  startedAt: '2026-09-29T12:00:00.000Z',
  finishedAt: null,
  error: null
};

const CREATED_RUN: SyncRun = {
  ...STARTED_RUN,
  id: 'run-created',
  playlistId: 'playlist-created'
};

const SHARE: Share = {
  accountId: 'account-2',
  account: ACCOUNT_TWO,
  level: ShareLevel.Read,
  createdAt: '2026-09-29T12:00:00.000Z'
};

const RETRY_TRACK: Track = {
  ...TRACK_THREE,
  fileStatus: TrackFileStatus.Downloading
};

const FETCH_WHOLE_TRACK: Track = {
  ...TRACK_THREE,
  skipNonMusic: false
};

const ADD_TRACK_RESULT: AddTrackResult = {
  results: [{ playlistId: 'playlist-1', outcome: AddTrackOutcome.Added }]
};

const RENAMED_PLAYLIST: Playlist = {
  ...PLAYLIST_ONE,
  name: 'Renamed'
};

const NO_CONTENT = (): HttpResponse<null> =>
  new HttpResponse(null, { status: 204 });

const PLAYLIST_ONE_PARAMS: EndpointParams = { playlistId: 'playlist-1' };

/*
 * `state` narrows the page and its total while the counts stay whole; the
 * queue route answers every status, because the client builds and filters it.
 */
function tracksPageOf(url: string): PlaylistTracksPage {
  const state = new URL(url).searchParams.get('state');
  const items =
    state === null
      ? PLAYLIST_ONE_TRACKS
      : PLAYLIST_ONE_TRACKS.filter(
          association => association.track.fileStatus === state
        );

  return {
    items,
    total: items.length,
    limit: 50,
    offset: 0,
    counts: countsOf(PLAYLIST_ONE_TRACKS)
  };
}

export const handlers = [
  mockEndpoint(endpoints.playlists, () =>
    respond(endpoints.playlists, PLAYLIST_PAGE)
  ),
  mockEndpoint(endpoints.accounts, () =>
    respond(endpoints.accounts, ACCOUNT_PAGE)
  ),
  /* The reader, which the share picker uses to leave the reader's own row out. */
  mockEndpoint(endpoints.currentAccount, () =>
    respond(endpoints.currentAccount, ACCOUNT_ONE)
  ),
  mockEndpoint(
    endpoints.playlistShares,
    () => respond(endpoints.playlistShares, []),
    PLAYLIST_ONE_PARAMS
  ),
  mockEndpoint(
    endpoints.grantShare,
    () => respond(endpoints.grantShare, SHARE),
    PLAYLIST_ONE_PARAMS
  ),
  mockEndpoint(endpoints.revokeShare, NO_CONTENT, PLAYLIST_ONE_PARAMS),
  /*
   * The same row as the first list item, so a test can tell the two reads apart
   * by their keys while the data stays consistent.
   */
  mockEndpoint(
    endpoints.playlist,
    () => respond(endpoints.playlist, PLAYLIST_ONE),
    PLAYLIST_ONE_PARAMS
  ),
  mockEndpoint(
    endpoints.latestSyncRun,
    () => respond(endpoints.latestSyncRun, LATEST_RUN),
    PLAYLIST_ONE_PARAMS
  ),
  mockEndpoint(
    endpoints.playlistTracks,
    ({ request }) =>
      respond(endpoints.playlistTracks, tracksPageOf(request.url)),
    PLAYLIST_ONE_PARAMS
  ),
  mockEndpoint(
    endpoints.playlistQueue,
    () => respond(endpoints.playlistQueue, { items: PLAYLIST_ONE_TRACKS }),
    PLAYLIST_ONE_PARAMS
  ),
  /*
   * The retry returns the track now downloading, the route's own shape; the
   * remove is a `204` with no body.
   */
  mockEndpoint(endpoints.retryTrack, () =>
    respond(endpoints.retryTrack, RETRY_TRACK)
  ),
  mockEndpoint(endpoints.fetchTrackWhole, () =>
    respond(endpoints.fetchTrackWhole, FETCH_WHOLE_TRACK)
  ),
  mockEndpoint(endpoints.removeTrack, NO_CONTENT),
  mockEndpoint(
    endpoints.renamePlaylist,
    () => respond(endpoints.renamePlaylist, RENAMED_PLAYLIST),
    PLAYLIST_ONE_PARAMS
  ),
  /* Echoes the sent value, so a test reads the optimistic result back. */
  mockEndpoint(
    endpoints.skipNonMusic,
    async ({ request }) => {
      const body = SkipNonMusicInputSchema.parse(await request.json());

      return respond(endpoints.skipNonMusic, {
        ...PLAYLIST_ONE,
        skipNonMusic: body.skipNonMusic
      });
    },
    PLAYLIST_ONE_PARAMS
  ),
  mockEndpoint(
    endpoints.sortPlaylist,
    async ({ request }) => {
      const body = SortPlaylistInputSchema.parse(await request.json());

      return respond(endpoints.sortPlaylist, {
        ...PLAYLIST_ONE,
        sort: body.sort
      });
    },
    PLAYLIST_ONE_PARAMS
  ),
  mockEndpoint(
    endpoints.pinPlaylist,
    async ({ request }) => {
      const body = PinPlaylistInputSchema.parse(await request.json());

      return respond(endpoints.pinPlaylist, {
        ...PLAYLIST_ONE,
        pinned: body.pinned
      });
    },
    PLAYLIST_ONE_PARAMS
  ),
  /*
   * One outcome per chosen playlist; the default says the first took it, and a
   * test needing a refusal overrides it.
   */
  mockEndpoint(endpoints.addTrack, () =>
    respond(endpoints.addTrack, ADD_TRACK_RESULT)
  ),
  /* Creating a playlist answers the run it started, as the route does. */
  mockEndpoint(endpoints.createPlaylist, () =>
    respond(endpoints.createPlaylist, CREATED_RUN, 202)
  ),
  mockEndpoint(
    endpoints.syncPlaylist,
    () => respond(endpoints.syncPlaylist, STARTED_RUN, 202),
    PLAYLIST_ONE_PARAMS
  ),
  mockEndpoint(endpoints.deletePlaylist, NO_CONTENT, PLAYLIST_ONE_PARAMS)
];
