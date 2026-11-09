import { eq } from 'drizzle-orm';

import type { IPangolinClient } from '../../../shared/pangolin.js';

import type { DatabaseHandle } from '../../../platform/database/client.js';
import {
  refreshFamilies,
  refreshTokens
} from '../../../platform/database/schema.js';
import { refreshTokenHash } from './credentialService/credentialService.js';
import { revokeFamily } from './revokeFamily.js';

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

/** True when a family was revoked; false when nothing matched or the account
 * does not own it. */
export async function revokeSession(
  input: RevokeSessionInput
): Promise<boolean> {
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
    return false;
  }

  await revokeFamily({
    database: input.database,
    pangolin: input.pangolin,
    familyId: found.family.id,
    now: input.now
  });

  return true;
}
