# 07: Authorize a sync

**Status:** resolved

## Outcome

Verified with no production change: the owner-or-write gate on the resync route, where a read collaborator and a
stranger both answer not-found, shipped with ticket 02. The client header and origin checks are the global CSRF
hook from the scaffold, which covers both mutations, so the resync route needed no check of its own. A brand-new
account creates a playlist, owns it, and no one else sees it. Shares are seeded directly, because the three share
routes (spec 05) are still stubs.

See [`01-sync-a-playlist.md`](../../specs/01-sync-a-playlist.md).
