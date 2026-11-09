import { eq } from 'drizzle-orm';

import type { IPangolinClient } from '../../../shared/pangolin.js';

import type { DatabaseHandle } from '../../../platform/database/client.js';
import {
  refreshFamilies,
  refreshTokens
} from '../../../platform/database/schema.js';
import { refreshTokenHash } from './credentialService/credentialService.js';
import { type RevokeFamilyResult, revokeFamily } from './revokeFamily.js';

/* Sign-out, like reuse, goes through the one family revocation. It says nothing
 * about ownership: an unknown token and another account's family are the same
 * no-op success. */

export interface RevokeSessionInput {
  readonly database: DatabaseHandle;
  readonly pangolin: IPangolinClient | null;
  readonly pangolinUserId: string;
  readonly refreshToken: string;
  readonly now: () => number;
}

/** The family ended, and the edge deletes that failed, if any. A false
 * `revoked` means nothing matched or the account does not own it. */
export interface RevokeSessionResult {
  readonly revoked: boolean;
  readonly revocation: RevokeFamilyResult | null;
}

export async function revokeSession(
  input: RevokeSessionInput
): Promise<RevokeSessionResult> {
  const found = input.database.db
    .select({ family: refreshFamilies })
    .from(refreshTokens)
    .innerJoin(refreshFamilies, eq(refreshTokens.familyId, refreshFamilies.id))
    .where(eq(refreshTokens.tokenHash, refreshTokenHash(input.refreshToken)))
    .get();

  if (
    found === undefined ||
    found.family.pangolinUserId !== input.pangolinUserId
  ) {
    return { revoked: false, revocation: null };
  }

  const revocation = await revokeFamily({
    database: input.database,
    pangolin: input.pangolin,
    familyId: found.family.id,
    now: input.now
  });

  return { revoked: true, revocation };
}
