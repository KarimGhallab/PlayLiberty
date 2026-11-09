import { and, asc, eq, sql } from 'drizzle-orm';

import type { Share, ShareLevel } from '@playliberty/contracts';

import {
  AccessNeed,
  EntryOutcome,
  playlistEntry
} from '../../shared/access/entry/entry.js';
import type { LiveEventContext } from '../../shared/events/liveEvents.js';
import { ChangeKind, announce } from '../../shared/events/liveEvents.js';
import type { Refused, Succeeded } from '../../shared/refusal.js';
import { Refusal } from '../../shared/refusal.js';

import type { DatabaseHandle } from '../../platform/database/client.js';
import type { AccountRow, ShareRow } from '../../platform/database/schema.js';
import { accounts, shares } from '../../platform/database/schema.js';
import { toAccountSummary } from '../accounts/accountService.js';

/*
 * Sharing is owner-only: a share grants access, so a collaborator allowed to
 * share would be a second owner. The access rules define each level.
 */

function toShareView(share: ShareRow, account: AccountRow): Share {
  return {
    accountId: share.accountId,
    account: toAccountSummary(account),
    level: share.level,
    createdAt: share.createdAt
  };
}

export type ShareListResult = { outcome: 'ok'; shares: Share[] } | Refused;

/* The owner's view of who holds a playlist; not-owner and missing are the same
 * refusal. Ordered by display name with a rowid tiebreak for equal names. */
export function listSharesForAccount(
  database: DatabaseHandle,
  playlistId: string,
  accountId: string
): ShareListResult {
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

  return entry.outcome === EntryOutcome.Granted
    ? { outcome: 'ok', shares: entry.value }
    : { outcome: 'refused', refusal: Refusal.PlaylistNotFoundManage };
}

export type GrantShareResult = { outcome: 'ok'; share: Share } | Refused;

export type ShareRevokeResult = Succeeded | Refused;

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
        return { outcome: 'refused', refusal: Refusal.SelfShare };
      }

      const target = context.database.db
        .select()
        .from(accounts)
        .where(eq(accounts.id, targetAccountId))
        .get();

      if (target === undefined) {
        return { outcome: 'refused', refusal: Refusal.AccountNotFound };
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
        outcome: 'ok',
        share: toShareView(share, target)
      };
    }
  );

  return entry.outcome === EntryOutcome.Granted
    ? entry.value
    : { outcome: 'refused', refusal: Refusal.PlaylistNotFoundManage };
}

/* A collaborator and a stranger get one not-found. The delete is idempotent, so
 * an absent share, even for an unknown account, still succeeds. */
export function revokeShareForAccount(
  context: LiveEventContext,
  playlistId: string,
  accountId: string,
  targetAccountId: string
): ShareRevokeResult {
  const entry = playlistEntry(
    context.database,
    playlistId,
    accountId,
    AccessNeed.Owner,
    (): ShareRevokeResult => {
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

      return { outcome: 'ok' };
    }
  );

  return entry.outcome === EntryOutcome.Granted
    ? entry.value
    : { outcome: 'refused', refusal: Refusal.PlaylistNotFoundManage };
}
