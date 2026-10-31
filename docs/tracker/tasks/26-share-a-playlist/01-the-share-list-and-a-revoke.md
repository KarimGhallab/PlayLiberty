# 01: The share list and a revoke

**Status:** ready-for-agent
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** None. Can start immediately.

## What to build

The Share item opens a real sheet from both surfaces: the detail's actions sheet and a gallery card's actions
sheet, which behave the same. The placeholder that said the surface arrives later loses Share and keeps Cover.

The sheet reads the playlist's shares. Each row carries the account's display name and avatar, its level as a word,
and a Revoke control. The read has three bodies: loading while it is in flight, a private empty state when nobody
else holds the playlist, and the read-failure body with a retry when it fails.

Revoke asks once, inline in the row: a stray tap must not end somebody's access. Confirming sends one request and
the row reports busy until the answer. A success refreshes the shares, the playlist and the library, so the
playlist's share mark settles. A refusal keeps the sheet and the row open with the problem's mapped sentence beside
that row, falling back to `shareDialog.revokeFailed` with the account's name.

The sheet is owner-only, which follows from the actions sheet: a write or read collaborator has no Share item and
therefore no way in. The server's refusal on the routes stays the second line.

Granting, level changes and the picker are [`02`](02-grant-and-change-a-level.md)'s.

## Acceptance criteria

- [ ] The owner opens the same share sheet from the detail's Share item and from a gallery card's Share item.
- [ ] Each row shows the account's display name, avatar, level and Revoke; no row is the owner's own account.
- [ ] Loading, private empty and read failure with retry are distinct bodies.
- [ ] Revoke asks once inline; confirming sends exactly one request; the row is busy until it answers.
- [ ] A refused revoke keeps the sheet and the row open with the mapped sentence, falling back to the account's name.
- [ ] A successful revoke refreshes the shares, the playlist and the library.
- [ ] A writer and a reader have no Share item, and the sheet cannot be opened for them.
- [ ] The new copy is in the English and French catalogs together.

## Verification

The share sheet's own test renders the read pending, empty, failed and settled, and asserts that Revoke asks once,
that one press sends one request, and that a refusal keeps the sheet open. The detail and gallery tests assert that
their Share item opens the sheet and that a collaborator's actions sheet has no Share item. The mobile suite,
typecheck, lint and build pass. On the emulator in French, revoke a real share and see the row go, then force a
refusal with airplane mode and see the sheet stay.
