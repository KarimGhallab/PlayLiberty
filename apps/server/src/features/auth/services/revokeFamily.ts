import { and, eq, gt, inArray, isNull } from 'drizzle-orm';

import type { IPangolinClient } from '../../../shared/pangolin.js';

import type { DatabaseHandle } from '../../../platform/database/client.js';
import {
  accessTokens,
  refreshFamilies
} from '../../../platform/database/schema.js';

/* One owner for ending a family: sign-out and reuse both revoke here. The edge
 * is told first, so a crash repeats the delete, never hides a live token. */

export interface RevokeFamilyInput {
  readonly database: DatabaseHandle;
  /* Null when the instance has no Integration API; there is then nothing to
   * delete at the edge, and the local rows still end. */
  readonly pangolin: IPangolinClient | null;
  readonly familyId: string;
  readonly now: () => number;
}

export interface RevokeFamilyResult {
  readonly familyId: string;
  readonly failedTokenIds: readonly string[];
}

export async function revokeFamily(
  input: RevokeFamilyInput
): Promise<RevokeFamilyResult> {
  const revokedAt = new Date(input.now()).toISOString();
  const live = input.database.db
    .select()
    .from(accessTokens)
    .where(
      and(
        eq(accessTokens.familyId, input.familyId),
        isNull(accessTokens.revokedAt),
        gt(accessTokens.expiresAt, revokedAt)
      )
    )
    .all();
  const failedTokenIds: string[] = [];
  const deletedTokenIds: string[] = [];

  if (input.pangolin !== null) {
    for (const token of live) {
      try {
        await input.pangolin.deleteResourceAccessToken(token.pangolinTokenId);
        deletedTokenIds.push(token.pangolinTokenId);
      } catch {
        failedTokenIds.push(token.pangolinTokenId);
      }
    }
  }

  input.database.unitOfWork(() => {
    input.database.db
      .update(refreshFamilies)
      .set({ revokedAt })
      .where(
        and(
          eq(refreshFamilies.id, input.familyId),
          isNull(refreshFamilies.revokedAt)
        )
      )
      .run();
    input.database.db
      .update(accessTokens)
      .set({ revokedAt })
      .where(
        and(
          eq(accessTokens.familyId, input.familyId),
          isNull(accessTokens.revokedAt),
          gt(accessTokens.expiresAt, revokedAt)
        )
      )
      .run();

    if (deletedTokenIds.length > 0) {
      input.database.db
        .update(accessTokens)
        .set({ edgeDeletedAt: revokedAt })
        .where(
          and(
            eq(accessTokens.familyId, input.familyId),
            inArray(accessTokens.pangolinTokenId, deletedTokenIds)
          )
        )
        .run();
    }
  });

  return { familyId: input.familyId, failedTokenIds };
}
