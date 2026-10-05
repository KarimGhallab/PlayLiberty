# 03: Write the duration the file reports

**What to build:** A trimmed file is shorter than its source, so the stored duration must be the file's own. The
adapter probes the finished file and returns its duration, and the worker writes it on success for every
download, trimmed or not. The player's clock and the scrub bar then match what is heard, and the existing drift
between the source metadata and the actual stream is gone.

**Blocked by:** [`02`](02-store-a-track-with-non-music-parts-skipped.md).

**Status:** ready-for-agent

**Labels:** `enhancement`, `ready-for-agent`

- [ ] A successful download writes the duration the adapter reports, not the source duration.
- [ ] The probe runs for a download with no segments cut as well.
- [ ] A failed download writes no duration.

**Verification:** the server route tests over a temporary database with a fake adapter reporting a distinct
duration, `pnpm run build` and `pnpm run lint`.
