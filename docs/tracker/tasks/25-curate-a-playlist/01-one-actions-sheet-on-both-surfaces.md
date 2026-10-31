# 01: One actions sheet on both surfaces

**Status:** ready-for-agent
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** None. Can start immediately.

## What to build

The playlist's actions are one sheet with one access rule, reached from the detail's header and from the gallery
card. The shared actions model produces the items for each access and can leave Pin off a surface that does not
offer it.

On the detail, the overflow is drawn for the owner and a write collaborator, and not for a read collaborator. The
owner's sheet holds Share, Rename, Cover, Sync now and Delete. A write collaborator's holds Cover and Sync now. A
reader gets no overflow on the detail. Pin stays off the detail, as [`28`](../../specs/28-pin-a-playlist.md) says.

On the gallery, the owner keeps Share, Rename, Cover, Sync now and Delete, the writer keeps Cover and Sync now, and
the reader keeps Pin alone.

Sync now runs from the detail's sheet and refreshes the playlist and the library. A refused Pin or Sync now keeps
the sheet open and draws the problem's title beside the items. The fallback sentence is used only when the answer
carries no problem title. A success closes the sheet.

Share, Rename and Cover open the existing placeholder surface on both screens in this ticket.
[`02`](02-rename-a-playlist.md) replaces Rename; [`26`](../../specs/26-share-a-playlist.md) and
[`29`](../../specs/29-set-a-playlist-cover.md) replace Share and Cover.

## Acceptance criteria

- [ ] The shared actions model produces the owner's, writer's and reader's items, and omits Pin when the surface does
      not offer it.
- [ ] The detail's overflow appears for the owner and a write collaborator, and is absent for a read collaborator.
- [ ] The detail's owner sheet holds Share, Rename, Cover, Sync now and Delete; the writer's holds Cover and Sync now.
- [ ] The gallery's owner, writer and reader sheets keep the items they have today, including Pin for a reader.
- [ ] Sync now from the detail starts the playlist's sync.
- [ ] A refused Pin or Sync now leaves the sheet open with the problem's title; a success closes it.
- [ ] Share, Rename and Cover reach the placeholder surface on both screens.
- [ ] The copy is in English and French.

## Verification

- `pnpm --filter @playliberty/mobile run typecheck`
- The mobile suite, focused on the actions model, the detail and the gallery.
- `pnpm run lint:check` and `pnpm run build` once at the end.
- On the emulator or a device: open the actions from the detail as the owner, a writer and a reader; start a sync
  from the detail; force a refusal and read the sentence.
