# 81: A missing thumbnail file draws an empty box

**State:** `needs-triage`
**Category:** `bug`

**Blocked by:** None. Can start immediately.

## Agent Brief

**Category:** bug
**Summary:** A track whose stored thumbnail file is gone leaves an empty box in the row, because the row's image has no error fallback to the no-art hatch the playlist cover already has.

**Current behavior:**
`TrackRow.tsx` sets `artwork = track.thumbnailPath === null ? null : URL` and renders the `<img>` with no `onError`. When `thumbnailPath` is set but the file is missing the server answers 404, the image is empty, and `__art` keeps `data-art="art"`, so the hatch is never drawn. Playlist covers handle this through `onCoverError` in `usePlaylistHeader`.

**Desired behavior:**
A failed track thumbnail sets the row's art to `no-art`, so it draws the same hatch the cover does, and the console stops carrying a 404 per dead thumbnail.

**Key interfaces:**

- The `data-art` attribute is the fallback switch.
- The playlist cover's `coverFailed` state is the model.

**Acceptance criteria:**

- [ ] A 404 thumbnail draws the hatch rather than an empty box.
- [ ] A working thumbnail is unaffected.
- [ ] A test holds the error fallback.
- [ ] `pnpm run build`, `pnpm run lint` and the unit suites pass.

**Out of scope:**

- Why the file is missing (the prune job's contract).

## Observed

- `GET /api/v1/tracks/dff084c1-37dc-422c-85b0-c60e3e591a57/thumbnail` returns 404 on the library, and the detail's "Wii Weather Channel (Night) Music" row draws a black square.

## Expected

- A dead track thumbnail reads as no artwork, not as a broken image.

## Evidence

- `apps/web/src/shared/components/TrackRow/TrackRow.tsx:66-70,190-200`.
- `apps/web/src/shared/components/PlaylistHeader/usePlaylistHeader.tsx` (`onCoverError`).
- Impeccable critique of `apps/web`, 2026-10-19, priority issue P2.
