import { randomUUID } from 'node:crypto';

import type { FastifyBaseLogger } from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';

import { ShareLevel } from '@playliberty/contracts';

import type { TestContext } from './testing/createTestContext.js';
import { createTestContext } from './testing/createTestContext.js';
import { seedAccount, seedPlaylist } from './testing/fixtures.js';

type Line = Record<string, unknown>;

/*
 * A logger that records what the app writes, injected as Fastify's logger so the
 * hooks and routes that log on `request.log` land here. It only needs the surface
 * Fastify requires; the audit fields are read back by name.
 */
function recordingLogger(): {
  logger: FastifyBaseLogger;
  lines: Line[];
} {
  const lines: Line[] = [];

  const record =
    (level: string) =>
    (payload: Record<string, unknown>, message?: string): void => {
      lines.push({ level, message, ...payload });
    };

  const logger = {
    level: 'info',
    info: record('info'),
    warn: record('warn'),
    error: record('error'),
    debug: record('debug'),
    fatal: record('fatal'),
    trace: record('trace'),
    child: (): unknown => logger
  } as unknown as FastifyBaseLogger;

  return { logger, lines };
}

let context: TestContext | undefined;

afterEach(async () => {
  await context?.cleanup();
  context = undefined;
});

function database(): NonNullable<TestContext>['database'] {
  if (context === undefined) {
    throw new Error('the test context is not created');
  }

  return context.database;
}

function lineFor(lines: Line[], action: string): Line | undefined {
  return lines.find(line => line.action === action);
}

describe('audit lines', () => {
  it('records an identity refusal with its path and reason', async () => {
    const { logger, lines } = recordingLogger();
    context = await createTestContext({}, { loggerInstance: logger });

    const response = await context.app.inject({
      method: 'GET',
      url: '/api/v1/me'
    });
    expect(response.statusCode).toBe(401);

    expect(lineFor(lines, 'identity_refused')).toMatchObject({
      audit: true,
      level: 'warn',
      outcome: 'refused',
      reason: 'identity_missing',
      path: '/api/v1/me'
    });
  });

  it('records an edge-assertion refusal with the identity that arrived', async () => {
    const { logger, lines } = recordingLogger();
    context = await createTestContext(
      { EDGE_ASSERTION: 'the-secret' },
      { loggerInstance: logger }
    );

    const response = await context.app.inject({
      method: 'GET',
      url: '/api/v1/me',
      headers: { 'remote-user': 'forged-user' }
    });
    expect(response.statusCode).toBe(401);

    expect(lineFor(lines, 'identity_refused')).toMatchObject({
      outcome: 'refused',
      reason: 'edge_assertion_missing',
      actor: 'forged-user'
    });
  });

  it('records a CSRF refusal with its path and reason', async () => {
    const { logger, lines } = recordingLogger();
    context = await createTestContext({}, { loggerInstance: logger });
    const owner = seedAccount(database(), { displayName: 'Owner' });

    const response = await context.app.inject({
      method: 'POST',
      url: '/api/v1/playlists',
      headers: { 'remote-user': owner.pangolinUserId },
      payload: {
        url: 'https://www.youtube.com/playlist?list=PL1234567890abcdef'
      }
    });
    expect(response.statusCode).toBe(403);

    expect(lineFor(lines, 'csrf_refused')).toMatchObject({
      audit: true,
      level: 'warn',
      outcome: 'refused',
      reason: 'csrf_header_missing',
      path: '/api/v1/playlists'
    });
  });

  it('records a share grant and a revoke with actor, playlist and target', async () => {
    const { logger, lines } = recordingLogger();
    context = await createTestContext({}, { loggerInstance: logger });
    const owner = seedAccount(database(), { displayName: 'Owner' });
    const target = seedAccount(database(), { displayName: 'Bea' });
    const { playlistId } = seedPlaylist(database(), owner.accountId);

    const granted = await context.app.inject({
      method: 'POST',
      url: `/api/v1/playlists/${playlistId}/shares`,
      headers: {
        'remote-user': owner.pangolinUserId,
        'x-playliberty-client': 'test'
      },
      payload: { accountId: target.accountId, level: ShareLevel.Read }
    });
    expect(granted.statusCode).toBe(200);

    expect(lineFor(lines, 'share_granted')).toMatchObject({
      outcome: 'allowed',
      actor: owner.accountId,
      playlist: playlistId,
      account: target.accountId,
      level: 'read'
    });

    const revoked = await context.app.inject({
      method: 'DELETE',
      url: `/api/v1/playlists/${playlistId}/shares/${target.accountId}`,
      headers: {
        'remote-user': owner.pangolinUserId,
        'x-playliberty-client': 'test'
      }
    });
    expect(revoked.statusCode).toBe(204);

    expect(lineFor(lines, 'share_revoked')).toMatchObject({
      outcome: 'allowed',
      actor: owner.accountId,
      playlist: playlistId,
      account: target.accountId
    });
  });

  it('records a playlist delete with the actor and the playlist', async () => {
    const { logger, lines } = recordingLogger();
    context = await createTestContext({}, { loggerInstance: logger });
    const owner = seedAccount(database(), { displayName: 'Owner' });
    const { playlistId } = seedPlaylist(database(), owner.accountId);

    const response = await context.app.inject({
      method: 'DELETE',
      url: `/api/v1/playlists/${playlistId}`,
      headers: {
        'remote-user': owner.pangolinUserId,
        'x-playliberty-client': 'test'
      }
    });
    expect(response.statusCode).toBe(204);

    expect(lineFor(lines, 'playlist_deleted')).toMatchObject({
      outcome: 'allowed',
      actor: owner.accountId,
      playlist: playlistId
    });
  });

  it('records a role change with the account and the new role', async () => {
    const pangolinUserId = `pangolin-${randomUUID()}`;
    const { logger, lines } = recordingLogger();
    context = await createTestContext(
      { ADMIN_PANGOLIN_USER_IDS: pangolinUserId },
      { loggerInstance: logger }
    );

    const { accountId } = seedAccount(database(), {
      pangolinUserId,
      displayName: 'Owner'
    });

    const response = await context.app.inject({
      method: 'GET',
      url: '/api/v1/me',
      headers: { 'remote-user': pangolinUserId }
    });
    expect(response.json().role).toBe('admin');

    expect(lineFor(lines, 'role_assigned')).toMatchObject({
      outcome: 'allowed',
      account: accountId,
      role: 'admin'
    });
  });

  it('records the test reset', async () => {
    const { logger, lines } = recordingLogger();
    context = await createTestContext({}, { loggerInstance: logger });
    const owner = seedAccount(database(), { displayName: 'Owner' });

    const response = await context.app.inject({
      method: 'POST',
      url: '/api/v1/__e2e__/reset',
      headers: {
        'remote-user': owner.pangolinUserId,
        'x-playliberty-client': 'test'
      }
    });
    expect(response.statusCode).toBe(204);

    expect(lineFor(lines, 'instance_reset')).toMatchObject({
      outcome: 'allowed'
    });
  });
});
