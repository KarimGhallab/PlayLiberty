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

## User Stories

1. As an owner, I want to see who a playlist is shared with, so that I know who can read it.
2. As an owner, I want each share's level, so that I know who can change it.
3. As an owner, I want to grant a read share, so that somebody can listen.
4. As an owner, I want to grant a write share, so that somebody can add and remove tracks.
5. As an owner, I want to change an existing share's level, so that I do not revoke and re-grant.
6. As an owner, I want to revoke a share, so that access ends.
7. As an owner, I want a revoke to ask once, so that a stray tap does not remove access.
8. As an owner, I want to pick an account from a list, so that I do not type a name.
9. As an owner, I want the list ordered by name, so that I can find somebody.
10. As an owner, I want my own account absent from the picker, so that I cannot share with myself.
11. As an owner, I want the picker to load more as I scroll, so that a long directory is not truncated.
12. As an owner, I want the picker to have no search field, so that the app does not grow one for a household list.
13. As an owner, I want a busy state per row, so that I do not send the same grant twice.
14. As an owner, I want a refused grant explained, so that I know the share did not land.
15. As an owner, I want a refused revoke explained, so that I know access is still there.
16. As an owner, I want an empty state when nobody has the playlist, so that I know it is private.
17. As an owner, I want a loading state, so that an empty list is not drawn while the read is in flight.
18. As a collaborator, I want no share sheet, so that I am not offered an action I cannot take.
19. As a collaborator, I want the playlist's own share mark, so that I know it is shared.
20. As a recipient, I want a granted playlist to appear in my gallery, so that I can listen without a link.
21. As a recipient, I want a revoked playlist to disappear, so that my gallery reflects my access.
22. As a screen-reader user, I want each share row named with its account and level, so that I can audit it.
23. As a French-speaking owner, I want the sheet in French, so that the app stays in my language.

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

## Testing Decisions

- A test earns its place only if it fails when an owner would notice. The tests assert that a collaborator's actions
  sheet has no Share item, that a level change is one request, that a revoke asks once, and that the owner's account
  is absent from the picker. They do not assert the sheet's layout or the avatar's fallback.
- **The share sheet is tested at its own seam** with the share read and the mutations mocked: the empty, loading and
  failure states, the level change, the revoke's confirmation and a refusal keeping the sheet open. Prior art is the
  web's `SharePlaylistDialog` tests.
- **The picker is tested at its seam**: the owner filtered out, the name order, and the next page appended.
- **The critical journey is a Maestro flow**: grant a read share to a second account, see it in the list, change it
  to write, and revoke it.
- **Cut tests:** no test of the avatar's image, the row's height, or the exact refusal copy.

## Out of Scope

- Inviting an account that does not exist, by email, link or any other route.
- A third share level, a per-track grant, and a public link.
- Notifications when a share is granted or revoked.
- An admin view of anybody's shares.
- A share from the gallery without opening the playlist.

## Further Notes

- The share sheet is the only place the app draws another account's identity. It reads the narrow directory view, so
  no email address and no role reaches the screen.
- Shipped differently: a gallery card's Share opens the same sheet as the detail's, rather than requiring the owner
  to open the playlist first. The decision is recorded in the [tickets](../tasks/26-share-a-playlist/TICKETS.md).
