import { and, eq, gt, isNull } from 'drizzle-orm';

import type { IPangolinClient } from '../../../../shared/pangolin.js';

import type { DatabaseHandle } from '../../../../platform/database/client.js';
import {
  accessTokens,
  refreshFamilies
} from '../../../../platform/database/schema.js';

/* One owner for ending a family: sign-out and reuse both revoke here. The edge
 * is told first, then the local rows, so a crash in between repeats the delete
 * rather than leaving a live token behind a revoked family. */

export interface RevokeFamilyInput {
  readonly database: DatabaseHandle;
  readonly pangolin: IPangolinClient;
  readonly familyId: string;
  readonly now: () => number;
}

export async function revokeFamily(input: RevokeFamilyInput): Promise<void> {
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

  for (const token of live) {
    try {
      await input.pangolin.deleteResourceAccessToken(token.pangolinTokenId);
    } catch {
      /* A failed delete must not keep the family alive locally. */
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
  });
}
