# 02: The detail's read states

**Status:** ready-for-agent
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [`01`](01-the-detail-reads-a-playlist.md)

## What to build

The detail draws one body for each read outcome.

A pending read draws a skeleton of rows under the identity block, announced once, with the placeholders hidden from
the accessibility tree.

A 404 on the playlist draws the playlist not-found body: the copy that says the playlist is not here, and one way
back to the gallery. It offers no retry, because a retry cannot change the answer.

Any other playlist read failure draws the read-failure body with the problem's sentence, falling back to the detail's
read-failed copy, and a retry that refetches the playlist read. A failed tracks read is its own read-failure body with
its own retry.

A never-synced playlist with no tracks offers Sync now to an owner or a write collaborator, and the control reports
its in-flight state. A synced playlist with no tracks says there are no tracks. A read collaborator sees the sentence
without a Sync now control.

## Acceptance criteria

- [ ] A pending playlist read draws the row skeleton and no empty list.
- [ ] A 404 draws the playlist not-found body with a way back and no retry.
- [ ] Any other failure draws the read-failure body with a retry that refetches the read that failed.
- [ ] A never-synced empty playlist offers Sync now to a writer; a synced empty playlist says there are no tracks.
- [ ] A read collaborator sees no Sync now control.
- [ ] The bodies and the skip of the Sync now render in French.

## Verification

`pnpm --filter @playliberty/mobile run typecheck`, the detail's Jest file, then `pnpm run build` and
`pnpm run lint:check`.
