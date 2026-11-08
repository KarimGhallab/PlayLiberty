# 01: Download and store a pending track

**Status:** resolved

## Outcome

A pass claims every
`pending` track in one conditional update that returns only the rows it moved to `downloading`, downloads each
through the adapter into the temporary directory, renames the finished file into the media store at its sharded
path, and writes `stored` with the path and a cleared failure reason. A stored track is not `pending`, so it is
never claimed again, and a second account's association to it streams immediately; a per-track catch keeps a
claimed track out of `downloading` when a download throws.

See [`02-store-a-track.md`](../../specs/02-store-a-track.md).
