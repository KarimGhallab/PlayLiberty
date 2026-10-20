# 05: Run only a few downloads at a time

**Status:** resolved

## Outcome

A pass now claims at most the configured number of tracks: it picks the oldest pending rows up to the cap and
moves them to `downloading` in one conditional update that returns only the rows it moved, then downloads the
whole batch at once, so no pass has more than the configured downloads in flight. A backlog larger than the cap
is worked through on the following pass, oldest first. The worker reads the cap from `config.download.concurrency`,
and a pass takes it as an argument, so a test drives a pass with any cap.

See [`02-store-a-track.md`](../../specs/02-store-a-track.md).
