import { describe, expect, it } from 'vitest';

import type {
  AgentFetchRequest,
  DownloadOptions,
  EgressAgentStatus,
  EgressCheckFacts,
  YoutubeSource
} from '../types.js';
import { SourceFailureKind, YoutubeSourceKind } from '../types.js';
import type { AgentReply } from './protocol.js';
import {
  AgentErrorCode,
  AgentHttpStatus,
  decodeReply,
  fetchBody,
  parseAgentStatus,
  parseApplyBody,
  parseCheckFacts,
  parseFetchBody,
  parseListBody,
  parseSourceExtension,
  parseSwitchBody,
  parseYoutubeSource,
  switchBody,
  wireReply
} from './protocol.js';

const DOWNLOAD: DownloadOptions = {
  concurrency: 1,
  sleepRequests: 1,
  sleepIntervalMin: 5,
  sleepIntervalMax: 15,
  limitRate: '5M',
  retries: 1,
  fragmentRetries: 1,
  fileAccessRetries: 1,
  socketTimeout: 30
};

const FETCH_REQUEST: AgentFetchRequest = {
  videoId: 'jNQXAC9IVRw',
  tempDir: '/tmp/download',
  skipNonMusic: true,
  download: DOWNLOAD,
  timeoutMs: 5000
};

const STATUS: EgressAgentStatus = {
  pool: [
    { name: '01-fr', endpoint: '185.0.0.1:51820' },
    { name: '02-ch', endpoint: null }
  ],
  active: '01-fr',
  loadedSince: '2026-10-23T10:00:00.000Z'
};

const CHECK: EgressCheckFacts = {
  handshake: true,
  listing: false,
  exitIp: '185.0.0.9',
  failure: SourceFailureKind.Blocked,
  active: '01-fr'
};

const SOURCE: YoutubeSource = {
  kind: YoutubeSourceKind.Playlist,
  sourceId: 'PL1234567890abcdef',
  title: 'Evening Jazz',
  entries: [
    {
      videoId: 'jNQXAC9IVRw',
      title: 'Me at the zoo',
      durationSeconds: 19,
      thumbnailUrl: null
    }
  ]
};

describe('the wire table', () => {
  it('writes one status per error and reads it back', () => {
    const replies: AgentReply[] = [
      { outcome: AgentErrorCode.InvalidRequest },
      { outcome: AgentErrorCode.UnknownConfig },
      { outcome: AgentErrorCode.SwitchFailed, detail: 'The exit refused.' },
      { outcome: AgentErrorCode.InvalidSource },
      {
        outcome: AgentErrorCode.SourceUnavailable,
        reason: SourceFailureKind.Blocked
      },
      { outcome: AgentErrorCode.Switching },
      { outcome: AgentErrorCode.Unavailable },
      { outcome: AgentErrorCode.SponsorBlock },
      { outcome: AgentErrorCode.Internal },
      { outcome: AgentErrorCode.NotFound }
    ];

    for (const reply of replies) {
      const wired = wireReply(reply);

      expect(decodeReply(wired)).toMatchObject({ outcome: reply.outcome });
    }
  });

  it('maps each error to its one status', () => {
    expect(wireReply({ outcome: AgentErrorCode.InvalidRequest }).status).toBe(
      AgentHttpStatus.BadRequest
    );
    expect(wireReply({ outcome: AgentErrorCode.UnknownConfig }).status).toBe(
      AgentHttpStatus.BadRequest
    );
    expect(
      wireReply({ outcome: AgentErrorCode.SwitchFailed, detail: 'no' }).status
    ).toBe(AgentHttpStatus.Refused);
    expect(wireReply({ outcome: AgentErrorCode.Switching }).status).toBe(
      AgentHttpStatus.Refused
    );
    expect(wireReply({ outcome: AgentErrorCode.Unavailable }).status).toBe(
      AgentHttpStatus.Gone
    );
    expect(
      wireReply({
        outcome: AgentErrorCode.SourceUnavailable,
        reason: SourceFailureKind.Network
      }).status
    ).toBe(AgentHttpStatus.SourceFailure);
    expect(wireReply({ outcome: AgentErrorCode.SponsorBlock }).status).toBe(
      AgentHttpStatus.SourceFailure
    );
    expect(wireReply({ outcome: AgentErrorCode.NotFound }).status).toBe(
      AgentHttpStatus.NotFound
    );
    expect(wireReply({ outcome: AgentErrorCode.Internal }).status).toBe(
      AgentHttpStatus.Internal
    );
  });

  it('keeps a refused switch detail and a source failure reason', () => {
    expect(
      decodeReply(
        wireReply({ outcome: AgentErrorCode.SwitchFailed, detail: 'refused' })
      )
    ).toEqual({
      outcome: AgentErrorCode.SwitchFailed,
      status: 503,
      detail: 'refused'
    });
    expect(
      decodeReply(
        wireReply({
          outcome: AgentErrorCode.SourceUnavailable,
          reason: SourceFailureKind.Blocked
        })
      )
    ).toEqual({
      outcome: AgentErrorCode.SourceUnavailable,
      status: 502,
      reason: SourceFailureKind.Blocked
    });
  });

  it('passes a 200 body through without reading an error', () => {
    expect(decodeReply({ status: 200, body: { any: 'body' } })).toEqual({
      outcome: 'ok',
      status: 200,
      body: { any: 'body' }
    });
  });

  it('refuses a status that disagrees with the body', () => {
    expect(
      decodeReply({ status: 503, body: { error: 'unavailable' } })
    ).toEqual({ outcome: 'unexpected', status: 503 });
    expect(decodeReply({ status: 502, body: { error: 'made_up' } })).toEqual({
      outcome: 'unexpected',
      status: 502
    });
    expect(decodeReply({ status: 500, body: null })).toEqual({
      outcome: 'unexpected',
      status: 500
    });
  });
});

describe('the request bodies', () => {
  it('round-trips a fetch request without its client-side temp directory', () => {
    const body = fetchBody(FETCH_REQUEST);

    expect(body).not.toHaveProperty('tempDir');
    expect(parseFetchBody(body)).toEqual({
      videoId: 'jNQXAC9IVRw',
      skipNonMusic: true,
      download: DOWNLOAD,
      timeoutMs: 5000
    });
  });

  it('drops a fetch whose download options lost a field', () => {
    const body = fetchBody(FETCH_REQUEST);

    expect(
      parseFetchBody({
        ...body,
        download: { ...DOWNLOAD, socketTimeout: undefined }
      })
    ).toBeNull();
    expect(
      parseFetchBody({ ...body, download: { ...DOWNLOAD, limitRate: '' } })
    ).toBeNull();
  });

  it('drops a fetch whose video id cannot be a file name', () => {
    expect(
      parseFetchBody({ ...fetchBody(FETCH_REQUEST), videoId: '../escape' })
    ).toBeNull();
  });

  it('reads the switch body with or without a name', () => {
    expect(parseSwitchBody(switchBody())).toEqual({});
    expect(parseSwitchBody(switchBody('02-ch'))).toEqual({ name: '02-ch' });
    expect(parseSwitchBody({ name: '' })).toBeNull();
    expect(parseSwitchBody(null)).toBeNull();
  });

  it('reads a list body only when it names a URL', () => {
    expect(parseListBody({ url: 'https://example.com' })).toEqual({
      url: 'https://example.com'
    });
    expect(parseListBody({ url: '' })).toBeNull();
    expect(parseListBody([])).toBeNull();
  });

  it('reads an apply body with an optional drain bound', () => {
    expect(parseApplyBody({ name: '02-ch' })).toEqual({ name: '02-ch' });
    expect(parseApplyBody({ name: '02-ch', drainTimeoutMs: 5000 })).toEqual({
      name: '02-ch',
      drainTimeoutMs: 5000
    });
    expect(parseApplyBody({ name: '02-ch', drainTimeoutMs: 0 })).toBeNull();
    expect(parseApplyBody({ name: '' })).toBeNull();
  });
});

describe('the response bodies', () => {
  it('reads the pool', () => {
    expect(parseAgentStatus(STATUS)).toEqual(STATUS);
  });

  it('refuses a pool config without a name', () => {
    expect(() =>
      parseAgentStatus({ ...STATUS, pool: [{ endpoint: null }] })
    ).toThrow(/without a name/);
  });

  it('reads the check facts, including what the listing said', () => {
    expect(parseCheckFacts(CHECK)).toEqual(CHECK);
    expect(
      parseCheckFacts({ ...CHECK, listing: true, failure: null })
    ).toMatchObject({ listing: true, failure: null });
  });

  it('refuses check facts that are not a kind', () => {
    expect(() => parseCheckFacts({ ...CHECK, failure: 'made_up' })).toThrow(
      /unexpected check result/
    );
  });

  it('reads a source and refuses an entry whose id is not a video id', () => {
    expect(parseYoutubeSource(SOURCE)).toEqual(SOURCE);
    expect(() =>
      parseYoutubeSource({
        ...SOURCE,
        entries: [
          {
            videoId: '../escape',
            title: 'bad entry',
            durationSeconds: null,
            thumbnailUrl: null
          }
        ]
      })
    ).toThrow(/unexpected source entry/);
  });

  it('reads only a plain extension from the fetch header', () => {
    expect(parseSourceExtension('webm')).toBe('webm');
    expect(parseSourceExtension('m4a')).toBe('m4a');
    expect(parseSourceExtension('../escape')).toBeNull();
    expect(parseSourceExtension(undefined)).toBeNull();
  });
});
