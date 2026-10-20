# Rename the manual sync route from /refresh to /sync

**Status:** resolved
**Labels:** `enhancement`

## Outcome

The manual route is `POST /playlists/:id/sync` and its message matches the sibling stubs; no caller, test or client built the old `/refresh` path. The route is described in [`ARCHITECTURE.md`](../../ARCHITECTURE.md), and the empty state's trigger is now true rather than aspirational.

See [the server stack](../../ARCHITECTURE.md#the-server-stack).
