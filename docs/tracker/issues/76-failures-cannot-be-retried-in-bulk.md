# 76: Failures cannot be retried in bulk

**State:** `needs-triage`
**Category:** `enhancement`

**Blocked by:** #75 for the copy it uses; the action itself can start immediately.

## Agent Brief

**Category:** enhancement
**Summary:** Retry and fetch-whole live only inside each failed row's lane menu, so a run that failed several tracks costs one menu visit per track and the failed filter offers no action.

**Current behavior:**
`TrackRow` builds its lane items from `failed && onRetry` and `failed && onFetchWhole`, and the detail passes both. The `Echec` chip filters to the failed rows and the sync band shows the failed count, but neither offers a retry.

**Desired behavior:**
One affordance retries every failed track the account can curate: on the filtered failed view and beside the failed count in the state block, worded as a count.

**Key interfaces:**

- `useRetryTrack` and its endpoint already exist; the batch is a loop or a batch route if one is added.
- The menu keeps its per-row Retry and Fetch whole.

**Acceptance criteria:**

- [ ] The failed view offers one control that retries all failed tracks in it.
- [ ] The control states how many it will retry and reflects the in-flight state.
- [ ] Per-row Retry is unchanged.
- [ ] `pnpm run build`, `pnpm run lint` and the unit suites pass.

**Out of scope:**

- Server-side batching, unless the loop proves slow enough to need it.

## Observed

- Three failed rows; three separate overflow menus; no bulk action on the failed chip.

## Expected

- One visible retry for the whole failed set.

## Evidence

- `apps/web/src/shared/components/TrackRow/TrackRow.tsx:90-150`.
- `apps/web/src/views/playlist-detail/PlaylistDetailPage/PlaylistDetailPage.tsx` (retry wiring).
- Impeccable critique of `apps/web`, 2026-10-19, priority issue P1.
