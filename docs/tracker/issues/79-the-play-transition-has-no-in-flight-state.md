# 79: The play transition has no in-flight state

**State:** `needs-triage`
**Category:** `bug`

**Blocked by:** None. Can start immediately.

## Agent Brief

**Category:** bug
**Summary:** Starting playback reads the playlist's queue with no timeout and no visible in-flight cue beyond a dimmed, disabled control, so a slow or hung read leaves the screen looking like the press did nothing.

**Current behavior:**
`usePlayTransition` exposes `starting`; the detail passes it as `playbackStarting` and the header disables the play while it is true. `readPlaylistQueue` has no timeout, so a request that never settles leaves `starting` true indefinitely: the play stays dimmed, no bar docks, no message appears. A row press gives no per-row feedback at all until the queue answers. During review, a stuck `/queue` read produced exactly a dead press.

**Desired behavior:**
The pressed control shows an in-flight state, and the read is bounded: on timeout it lands on the existing `detail.playbackFailed` with "Relancer la lecture" rather than hanging.

**Key interfaces:**

- `PlayTransition.starting` and `retryable` stay the seam; the timeout joins them.
- `ReadFailure`'s retry pattern is the model for the failure state.

**Acceptance criteria:**

- [ ] Pressing play shows a state on the control that was pressed.
- [ ] A queue read that does not settle within a bounded time surfaces the retry path.
- [ ] The player bar docks once the queue answers, as it does today.
- [ ] A test holds the timeout path with a scripted non-settling request.
- [ ] `pnpm run build`, `pnpm run lint` and the unit suites pass.

**Out of scope:**

- The queue endpoint and its pagination.

## Observed

- With `/playlists/:id/queue` pending, the play stayed disabled and silent; no toast, no error, no console message.
- With the endpoint answering, the bar docks and plays normally (verified at desktop and phone).

## Expected

- A press is always acknowledged, and a stalled read resolves to something the user can retry.

## Evidence

- `apps/web/src/shared/player/usePlayTransition/usePlayTransition.ts:78-100`.
- `apps/web/src/views/playlist-detail/PlaylistDetailPage/PlaylistDetailPage.tsx:300-302,362`.
- Impeccable critique of `apps/web`, 2026-10-19, priority issue P2.
