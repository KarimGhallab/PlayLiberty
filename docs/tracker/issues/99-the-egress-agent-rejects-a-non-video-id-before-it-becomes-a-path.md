# 99: The egress agent rejects a non-video id before it becomes a path

**State:** `resolved`
**Category:** `bug`
**Blocked by:** None. Can start immediately.

## Outcome

A video id now has to pass the shared shape check before it can become a path. The agent's `/fetch` parser calls `isValidVideoId`, so an id with a slash, a fragment, a traversal segment, or the wrong shape returns 400 before the fetcher is called and no yt-dlp process starts. The egress client's listing parser calls the same check, so an entry with an invalid id fails the read instead of being stored; the local transport already did this through `toEntry`.

`YtdlpFetcher.fetchTrack` builds its output template through one helper that validates the id and proves the template stays inside the per-request temp directory before the tool starts, so both transports inherit the containment rule. The download worker now computes its media and thumbnail paths inside the per-track error boundary, so one invalid row fails on its own and the rest of the pass completes.

Verification: `pnpm --filter @playliberty/youtube test` (47), `pnpm --filter @playliberty/egress-agent test` (54), `pnpm --filter @playliberty/server test` (431), `pnpm run build`, and `pnpm run lint:check` all pass. The new tests cover the refused `/fetch` ids with no fetcher call, an invalid listing entry, a traversal id that writes nothing outside the temp directory, and a pass holding one invalid row beside a valid one.
