# Share a playlist on mobile

Status: resolved
Labels: `enhancement`, `ready-for-agent`

## Problem Statement

An owner on a phone cannot give a playlist to anybody. The web client lists the shares, grants one at either level
and revokes it, and the account directory exists for the picker. On a phone the grant is two choices that must fit a
sheet: which account, and which level, and a revoke is a destructive action beside a level change.

## Solution

One share sheet, opened from the playlist's actions sheet and drawn for the owner only. It lists the current shares
with each account's name and avatar, a read or write level and a revoke, and an Add row that opens the account
picker. The picker is the directory, paged and ordered by display name, with the owner's own account absent. A level
change is an upsert, a revoke asks once, and a refusal stays in the sheet with one sentence.

## Implementation Decisions

- **The share sheet is opened from the actions sheet and exists only for the owner.** A collaborator's actions sheet
  has no Share item, and the server refuses the routes anyway. `Decided here:` the web's rule, kept because a share
  is a grant of access and an account that can grant it is an owner by definition.
- **The list draws each share with the account's display name and avatar, its level and a revoke.** A level change is
  the same upsert the grant uses, so one control serves both. `Decided here:` a separate "change level" flow would be
  two actions for one change of mind.
- **The picker is a pushed sheet over the share sheet, showing the account directory ordered by display name.** It is
  paged and appends as it scrolls, and it has no search field. The owner's own account is absent.
- **A revoke asks once, inline.** `Decided here:` a modal confirmation on top of a sheet on top of a sheet is three
  layers for one press.
- **A refusal stays in the sheet with the problem's title**, mapped by code, beside the row that caused it.
- **The empty state says the playlist is private.** A loading state is drawn while the read is in flight, and a read
  failure is the read-failure body with a retry.
- **Granting and revoking invalidate the playlist, its shares and the gallery**, as the web's map says, because a
  collaborator's library changes too.
- **Inherited decisions are referenced, not restated:** the owner-only rule, the two levels, the upsert, the refusal
  for a missing account, the directory's narrow view and the no-invitation rule are
  [`05-share-a-playlist`](05-share-a-playlist.md)'s.
- **A gallery card's Share opens the same sheet as the detail's,** rather than requiring the owner to open the playlist first.

## Out of Scope

- Inviting an account that does not exist, by email, link or any other route.
- A third share level, a per-track grant, and a public link.
- Notifications when a share is granted or revoked.
- An admin view of anybody's shares.
