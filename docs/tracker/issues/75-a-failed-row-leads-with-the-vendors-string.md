# 75: A failed row leads with the vendor's string

**State:** `needs-triage`
**Category:** `bug`

**Blocked by:** None. Can start immediately.

## Agent Brief

**Category:** bug
**Summary:** A failed download shows the server's raw yt-dlp stderr, in red, as the visible lead of the row, ellipsized to one line with the full text only in `title`.

**Current behavior:**
`TrackRow.tsx` renders `track.failureReason` into `__reason`, whose styles set `--tone-failed`, one line, `text-overflow: ellipsis`, and `title` for the full text. The stored reason is a developer string such as `yt-dlp exited with code 1: ERROR: unable to download video data: HTTP Error 403: Forbidden`. `SyncError` already implements the intended pattern: a mapped sentence with the raw diagnostic behind a reveal.

**Desired behavior:**
The row leads with a mapped sentence for the known failure classes (unavailable, private, blocked, network), keeps the raw reason behind a disclosure, and allows the sentence two lines. The state word and its tone stay.

**Key interfaces:**

- The server's `failureReason` stays the untrusted input.
- The mapping belongs beside the existing problem-code mapping, not in the row.

**Acceptance criteria:**

- [ ] A household user reads a sentence they can act on, not `yt-dlp` or `403`.
- [ ] The raw diagnostic remains reachable without hover (touch included).
- [ ] The failed tone and the state word are unchanged.
- [ ] `pnpm run build`, `pnpm run lint` and the unit suites pass.

**Out of scope:**

- Which failures the server retries, and the download worker.
- The `SyncError` surface, which already does this.

## Observed

- The row reads `Echec` over `yt-dlp exited with code 1: ERROR: ... HTTP Error 403: Forbidden`, truncated at ~11px.

## Expected

- A mapped sentence leads; the raw string is disclosed on demand.

## Evidence

- `apps/web/src/shared/components/TrackRow/TrackRow.tsx:230-240`.
- `apps/web/src/shared/components/TrackRow/TrackRow.module.scss:175-188`.
- `/tmp/opencode/critique-a-desktop-playing.png` (Cid's Theme row).
- Impeccable critique of `apps/web`, 2026-10-19, priority issue P1.
