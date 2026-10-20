import { and, asc, eq, sql } from 'drizzle-orm';

import type { Share, ShareLevel } from '@playliberty/contracts';

import {
  AccessNeed,
  EntryOutcome,
  playlistEntry
} from '../../shared/access/entry.js';
import type { LiveEventContext } from '../../shared/events/liveEvents.js';
import { ChangeKind, announce } from '../../shared/events/liveEvents.js';

import type { DatabaseHandle } from '../../platform/database/client.js';
import type { AccountRow, ShareRow } from '../../platform/database/schema.js';
import { accounts, shares } from '../../platform/database/schema.js';
import { toAccountSummary } from '../accounts/accountService.js';

/*
 * Sharing is owner-only: a share grants access, so a collaborator allowed to
 * share would be a second owner. The level is the enum's two members; what each
 * means is enforced by the access rules the rest of the app already asks.
 */

function toShareView(share: ShareRow, account: AccountRow): Share {
  return {
    accountId: share.accountId,
    account: toAccountSummary(account),
    level: share.level,
    createdAt: share.createdAt
  };
}

/* The owner's view of who holds a playlist; not-owner and missing are the same
 * null. Ordered by display name with a rowid tiebreak for equal names. */
export function listSharesForAccount(
  database: DatabaseHandle,
  playlistId: string,
  accountId: string
): Share[] | null {
  const entry = playlistEntry(
    database,
    playlistId,
    accountId,
    AccessNeed.Owner,
    () => {
      const rows = database.db
        .select({ share: shares, account: accounts })
        .from(shares)
        .innerJoin(accounts, eq(shares.accountId, accounts.id))
        .where(eq(shares.playlistId, playlistId))
        .orderBy(asc(accounts.displayName), asc(sql`${accounts}.rowid`))
        .all();

      return rows.map(row => toShareView(row.share, row.account));
    }
  );

  return entry.outcome === EntryOutcome.Granted ? entry.value : null;
}

export enum GrantShareOutcome {
  Ok = 'ok',
  PlaylistNotFound = 'playlist_not_found',
  TargetNotFound = 'target_not_found',
  SelfShare = 'self_share'
}

export type GrantShareResult =
  | { outcome: GrantShareOutcome.Ok; share: Share }
  | { outcome: GrantShareOutcome.PlaylistNotFound }
  | { outcome: GrantShareOutcome.TargetNotFound }
  | { outcome: GrantShareOutcome.SelfShare };

export enum ShareRevokeOutcome {
  Ok = 'ok',
  PlaylistNotFound = 'playlist_not_found'
}

/* An upsert on the (playlist, account) index: a regrant changes the level; the
 * first created time stays. Every other refusal is the same not-found. */
export function grantShareForAccount(
  context: LiveEventContext,
  playlistId: string,
  accountId: string,
  targetAccountId: string,
  level: ShareLevel
): GrantShareResult {
  const entry = playlistEntry(
    context.database,
    playlistId,
    accountId,
    AccessNeed.Owner,
    (): GrantShareResult => {
      if (targetAccountId === accountId) {
        return { outcome: GrantShareOutcome.SelfShare };
      }

      const target = context.database.db
        .select()
        .from(accounts)
        .where(eq(accounts.id, targetAccountId))
        .get();

      if (target === undefined) {
        return { outcome: GrantShareOutcome.TargetNotFound };
      }

      const share = context.database.db
        .insert(shares)
        .values({ playlistId, accountId: targetAccountId, level })
        .onConflictDoUpdate({
          target: [shares.playlistId, shares.accountId],
          set: { level }
        })
        .returning()
        .get();

      if (share === undefined) {
        throw new Error('The granted share could not be read back.');
      }

      announce(context, { kind: ChangeKind.PlaylistChanged, playlistId });

      return {
        outcome: GrantShareOutcome.Ok,
        share: toShareView(share, target)
      };
    }
  );

  return entry.outcome === EntryOutcome.Granted
    ? entry.value
    : { outcome: GrantShareOutcome.PlaylistNotFound };
}

/* A collaborator and a stranger get one not-found. The delete is idempotent, so
 * an absent share, even for an unknown account, still succeeds. */
export function revokeShareForAccount(
  context: LiveEventContext,
  playlistId: string,
  accountId: string,
  targetAccountId: string
): ShareRevokeOutcome {
  const entry = playlistEntry(
    context.database,
    playlistId,
    accountId,
    AccessNeed.Owner,
    (): ShareRevokeOutcome => {
      context.database.db
        .delete(shares)
        .where(
          and(
            eq(shares.playlistId, playlistId),
            eq(shares.accountId, targetAccountId)
          )
        )
        .run();

      announce(context, {
        kind: ChangeKind.PlaylistRemoved,
        playlistId,
        accountIds: [targetAccountId]
      });
      announce(context, { kind: ChangeKind.PlaylistChanged, playlistId });

      return ShareRevokeOutcome.Ok;
    }
  );

  return entry.outcome === EntryOutcome.Granted
    ? entry.value
    : ShareRevokeOutcome.PlaylistNotFound;
}
