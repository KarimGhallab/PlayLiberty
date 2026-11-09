import { randomBytes } from 'node:crypto';

import { and, eq, isNull } from 'drizzle-orm';

import type { MobileToken } from '@playliberty/contracts';

import type { IPangolinClient } from '../../../shared/pangolin.js';

import type { DatabaseHandle } from '../../../platform/database/client.js';
import {
  accessTokens,
  refreshFamilies,
  refreshTokens
} from '../../../platform/database/schema.js';
import {
  type MobileLifetimes,
  refreshTokenHash
} from './credentialService/credentialService.js';
import type { RefreshGraceCache } from './refreshGraceCache.js';
import { type RevokeFamilyResult, revokeFamily } from './revokeFamily.js';
import type { SingleFlight } from './singleFlight.js';

/* The rotation mints before consuming, so a Pangolin failure leaves the token
 * usable. A membership refusal is treated as an outage, not a removal. */

export type RefreshRefusalReason =
  | 'refresh_token_unknown'
  | 'refresh_token_reuse'
  | 'refresh_token_expired'
  | 'family_revoked'
  | 'family_expired';

export type RefreshOutcome =
  | {
      readonly outcome: 'ok';
      readonly pair: MobileToken;
      readonly pangolinUserId: string;
      readonly replayed: boolean;
    }
  | {
      readonly outcome: 'invalid_grant';
      readonly reason: RefreshRefusalReason;
      readonly pangolinUserId: string | null;
      readonly revocation?: RevokeFamilyResult;
    }
  | {
      readonly outcome: 'rate_limited';
      readonly pangolinUserId: string | null;
    }
  | {
      readonly outcome: 'agent_unreachable';
      readonly pangolinUserId: string | null;
    };

export interface RefreshMobileSessionInput {
  readonly database: DatabaseHandle;
  readonly pangolin: IPangolinClient;
  readonly lifetimes: MobileLifetimes;
  readonly refreshToken: string;
  readonly grace: RefreshGraceCache;
  readonly rotations: SingleFlight<RefreshOutcome>;
  readonly allowAttempt: (key: string) => boolean;
  readonly now: () => number;
}

const ACCESS_TOKEN_TITLE = 'PlayLiberty mobile';

export async function refreshMobileSession(
  input: RefreshMobileSessionInput
): Promise<RefreshOutcome> {
  const nowMs = input.now();
  const presentedHash = refreshTokenHash(input.refreshToken);
  const found = input.database.db
    .select({ token: refreshTokens, family: refreshFamilies })
    .from(refreshTokens)
    .innerJoin(refreshFamilies, eq(refreshTokens.familyId, refreshFamilies.id))
    .where(eq(refreshTokens.tokenHash, presentedHash))
    .get();

  if (found === undefined) {
    return {
      outcome: 'invalid_grant',
      reason: 'refresh_token_unknown',
      pangolinUserId: null
    };
  }

  const { token, family } = found;
  const pangolinUserId = family.pangolinUserId;

  /* Every attempt that names a family spends its budget, so one family cannot
   * consume every caller's allowance. */
  if (!input.allowAttempt(`family:${family.id}`)) {
    return { outcome: 'rate_limited', pangolinUserId };
  }

  if (family.revokedAt !== null) {
    return {
      outcome: 'invalid_grant',
      reason: 'family_revoked',
      pangolinUserId
    };
  }

  const familyExpiresMs = Date.parse(family.expiresAt);

  if (familyExpiresMs <= nowMs) {
    return {
      outcome: 'invalid_grant',
      reason: 'family_expired',
      pangolinUserId
    };
  }

  const inFlight = input.rotations.pending(presentedHash);

  if (inFlight !== undefined) {
    return await inFlight;
  }

  if (token.consumedAt !== null) {
    const replayed = input.grace.pairFor(family.id, presentedHash, nowMs);

    if (replayed !== null) {
      return {
        outcome: 'ok',
        pangolinUserId,
        pair: replayed,
        replayed: true
      };
    }

    /* Outside the grace window a consumed token is reuse: cut the family and
     * every access token it still holds. */
    const revocation = await revokeFamily({
      database: input.database,
      pangolin: input.pangolin,
      familyId: family.id,
      now: input.now
    });
    input.grace.drop(family.id);

    return {
      outcome: 'invalid_grant',
      reason: 'refresh_token_reuse',
      pangolinUserId,
      ...(revocation.failedTokenIds.length > 0 ? { revocation } : {})
    };
  }

  if (Date.parse(token.expiresAt) <= nowMs) {
    return {
      outcome: 'invalid_grant',
      reason: 'refresh_token_expired',
      pangolinUserId
    };
  }

  return input.rotations.run(presentedHash, async () => {
    const familyRemainingSeconds = secondsBetween(nowMs, familyExpiresMs);
    const accessSeconds = Math.min(
      input.lifetimes.accessSeconds,
      familyRemainingSeconds
    );
    const refreshSeconds = Math.min(
      input.lifetimes.refreshSeconds,
      familyRemainingSeconds
    );

    let access;

    try {
      access = await input.pangolin.mintResourceAccessToken({
        pangolinUserId,
        validForSeconds: accessSeconds,
        title: `${ACCESS_TOKEN_TITLE} ${family.id.slice(0, 8)}`
      });
    } catch {
      return { outcome: 'agent_unreachable', pangolinUserId };
    }

    const replacement = randomBytes(32).toString('base64url');
    const accessExpiresMs = nowMs + accessSeconds * 1000;
    const refreshExpiresMs = nowMs + refreshSeconds * 1000;
    const usedAt = new Date(nowMs).toISOString();

    const committed = input.database.unitOfWork(() => {
      const claimed = input.database.db
        .update(refreshTokens)
        .set({ consumedAt: usedAt })
        .where(
          and(eq(refreshTokens.id, token.id), isNull(refreshTokens.consumedAt))
        )
        .run();

      if (claimed.changes === 0) {
        return false;
      }

      input.database.db
        .insert(accessTokens)
        .values({
          pangolinTokenId: access.id,
          familyId: family.id,
          expiresAt: new Date(accessExpiresMs).toISOString()
        })
        .run();
      input.database.db
        .insert(refreshTokens)
        .values({
          familyId: family.id,
          tokenHash: refreshTokenHash(replacement),
          expiresAt: new Date(refreshExpiresMs).toISOString()
        })
        .run();
      input.database.db
        .update(refreshFamilies)
        .set({ lastUsedAt: usedAt })
        .where(eq(refreshFamilies.id, family.id))
        .run();

      return true;
    });

    if (!committed) {
      const replayed = input.grace.pairFor(family.id, presentedHash, nowMs);

      if (replayed !== null) {
        return {
          outcome: 'ok',
          pangolinUserId,
          pair: replayed,
          replayed: true
        };
      }

      return { outcome: 'agent_unreachable', pangolinUserId };
    }

    const pair: MobileToken = {
      access: {
        id: access.id,
        secret: access.secret,
        expires_at: new Date(accessExpiresMs).toISOString(),
        expires_in: accessSeconds
      },
      refresh: {
        token: replacement,
        expires_at: new Date(refreshExpiresMs).toISOString(),
        expires_in: refreshSeconds
      }
    };

    input.grace.record(family.id, presentedHash, pair, nowMs);

    return { outcome: 'ok', pangolinUserId, pair, replayed: false };
  });
}

function secondsBetween(fromMs: number, toMs: number): number {
  return Math.max(1, Math.floor((toMs - fromMs) / 1000));
}
