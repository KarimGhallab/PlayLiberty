# 99: The egress agent rejects a non-video id before it becomes a path

**State:** `resolved`
**Category:** `bug`

## Outcome

A video id now has to pass the shared shape check before it can become a path. The agent's `/fetch` parser calls `isValidVideoId`, so an id with a slash, a fragment, a traversal segment, or the wrong shape returns 400 before the fetcher is called and no yt-dlp process starts. The egress client's listing parser calls the same check, so an entry with an invalid id fails the read instead of being stored; the local transport already did this through `toEntry`.

`YtdlpFetcher.fetchTrack` builds its output template through one helper that validates the id and proves the template stays inside the per-request temp directory before the tool starts, so both transports inherit the containment rule. The download worker now computes its media and thumbnail paths inside the per-track error boundary, so one invalid row fails on its own and the rest of the pass completes.
