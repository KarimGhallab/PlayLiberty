# 07: The card's actions

**Status:** ready-for-agent
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [`01`](01-one-sheet-frame-for-the-app.md), [`02`](02-the-gallery-draws-the-playlists.md)

## What to build

The card's scrim carries an overflow control named for its playlist. It opens the app's actions sheet, filtered by access: an owner sees Pin or Unpin, Share, Rename, Cover, Sync now and Delete; a write collaborator sees Pin or Unpin, Cover and Sync now; a reader sees Pin or Unpin. Pin reads Pin while unpinned and Unpin while pinned.

Pin is optimistic: the card moves on the press, the gallery is invalidated on the answer, and a refusal restores the card and shows the pin-failure notice. Delete is deferred: the card leaves the gallery immediately, the delete is sent after six seconds, and the app's undo snackbar offers Undo for that window; Undo restores the card and sends nothing, and a committed delete invalidates the gallery.

Share, Rename and Cover open placeholder sheets that name the action and say the surface arrives later. Specs `26`, `25` and `29` replace their bodies.

## Acceptance criteria

- [ ] Each access level produces the item set above.
- [ ] Pin reads Pin while unpinned and Unpin while pinned.
- [ ] The pin moves the card on the press and restores it on a refusal, with the pin-failure notice.
- [ ] Delete removes the card immediately, sends after six seconds, and Undo restores it without sending.
- [ ] A committed delete invalidates the gallery.
- [ ] Share, Rename and Cover open their placeholder sheets.

## Verification

`pnpm --filter @playliberty/mobile run test` and `pnpm --filter @playliberty/mobile run typecheck`. The shared actions model's tests cover the item set, the pin label, the optimistic move and the delete deferral.
