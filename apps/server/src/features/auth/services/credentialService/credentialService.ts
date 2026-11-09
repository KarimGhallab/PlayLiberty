import { createHash, randomBytes, randomUUID } from 'node:crypto';

import type { MobileToken } from '@playliberty/contracts';

import type { IPangolinClient } from '../../../../shared/pangolin.js';

import type { DatabaseHandle } from '../../../../platform/database/client.js';
import {
  accessTokens,
  refreshFamilies,
  refreshTokens
} from '../../../../platform/database/schema.js';

/* A family is one provisioning. Its access tokens are minted before anything is
 * written; the refresh token's plaintext never reaches the database. */

export interface MobileLifetimes {
  readonly accessSeconds: number;
  readonly refreshSeconds: number;
  readonly familySeconds: number;
}

export interface IssueMobileSessionInput {
  readonly database: DatabaseHandle;
  readonly pangolin: IPangolinClient;
  readonly lifetimes: MobileLifetimes;
  readonly pangolinUserId: string;
  readonly now: () => number;
}

const REFRESH_TOKEN_TITLE = 'PlayLiberty mobile';

export class MobileSessionUnavailableError extends Error {
  constructor() {
    super('The mobile session could not be issued');
    this.name = 'MobileSessionUnavailableError';
  }
}

export async function issueMobileSession(
  input: IssueMobileSessionInput
): Promise<MobileToken> {
  const nowMs = input.now();
  const familyId = randomUUID();
  const familyExpiresMs = nowMs + input.lifetimes.familySeconds * 1000;
  const accessSeconds = Math.min(
    input.lifetimes.accessSeconds,
    secondsBetween(nowMs, familyExpiresMs)
  );
  const refreshSeconds = Math.min(
    input.lifetimes.refreshSeconds,
    secondsBetween(nowMs, familyExpiresMs)
  );

  const access = await input.pangolin.mintResourceAccessToken({
    pangolinUserId: input.pangolinUserId,
    validForSeconds: accessSeconds,
    title: `${REFRESH_TOKEN_TITLE} ${familyId.slice(0, 8)}`
  });

  const refreshToken = randomBytes(32).toString('base64url');
  const accessExpiresMs = nowMs + accessSeconds * 1000;
  const refreshExpiresMs = nowMs + refreshSeconds * 1000;
  const issuedAt = new Date(nowMs).toISOString();

  input.database.unitOfWork(() => {
    input.database.db
      .insert(refreshFamilies)
      .values({
        id: familyId,
        pangolinUserId: input.pangolinUserId,
        createdAt: issuedAt,
        lastUsedAt: issuedAt,
        expiresAt: new Date(familyExpiresMs).toISOString()
      })
      .run();
    input.database.db
      .insert(refreshTokens)
      .values({
        familyId,
        tokenHash: refreshTokenHash(refreshToken),
        expiresAt: new Date(refreshExpiresMs).toISOString()
      })
      .run();
    input.database.db
      .insert(accessTokens)
      .values({
        pangolinTokenId: access.id,
        familyId,
        expiresAt: new Date(accessExpiresMs).toISOString()
      })
      .run();
  });

  return {
    access: {
      id: access.id,
      secret: access.secret,
      expires_at: new Date(accessExpiresMs).toISOString(),
      expires_in: accessSeconds
    },
    refresh: {
      token: refreshToken,
      expires_at: new Date(refreshExpiresMs).toISOString(),
      expires_in: refreshSeconds
    }
  };
}

export function refreshTokenHash(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function secondsBetween(fromMs: number, toMs: number): number {
  return Math.max(1, Math.floor((toMs - fromMs) / 1000));
}
