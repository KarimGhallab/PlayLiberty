import { and, eq, gt, isNotNull, isNull } from 'drizzle-orm';
import type { FastifyBaseLogger } from 'fastify';

import { audit } from '../../../shared/audit.js';
import type { IPangolinClient } from '../../../shared/pangolin.js';

import type { DatabaseHandle } from '../../../platform/database/client.js';
import { accessTokens } from '../../../platform/database/schema.js';

export const REVOCATION_RETRY_INTERVAL_MS = 60_000;

export interface RevokePendingInput {
  readonly database: DatabaseHandle;
  readonly pangolin: IPangolinClient | null;
  readonly logger: FastifyBaseLogger;
  readonly now: () => number;
}

export interface RevokePendingResult {
  readonly retried: number;
  readonly failed: number;
}

/* A failed edge delete leaves a revoked row without `edgeDeletedAt`. The job
 * retries those rows until the edge confirms, and never past the token's own
 * expiry, where the edge rejects it anyway. */
export async function revokePending(
  input: RevokePendingInput
): Promise<RevokePendingResult> {
  if (input.pangolin === null) {
    return { retried: 0, failed: 0 };
  }

  const retriedAt = new Date(input.now()).toISOString();
  const pending = input.database.db
    .select()
    .from(accessTokens)
    .where(
      and(
        isNotNull(accessTokens.revokedAt),
        isNull(accessTokens.edgeDeletedAt),
        gt(accessTokens.expiresAt, retriedAt)
      )
    )
    .all();

  let retried = 0;
  let failed = 0;

  for (const token of pending) {
    try {
      await input.pangolin.deleteResourceAccessToken(token.pangolinTokenId);
      input.database.db
        .update(accessTokens)
        .set({ edgeDeletedAt: retriedAt })
        .where(eq(accessTokens.pangolinTokenId, token.pangolinTokenId))
        .run();
      retried += 1;
    } catch {
      failed += 1;
      audit(input.logger, {
        action: 'revocation_failed',
        outcome: 'refused',
        reason: 'edge_delete_failed',
        family: token.familyId,
        token: token.pangolinTokenId
      });
    }
  }

  return { retried, failed };
}
