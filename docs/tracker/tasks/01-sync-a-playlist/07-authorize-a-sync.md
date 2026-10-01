# 07: Authorize a sync

**What to build:** The two mutating routes enforce who may act. Starting a sync is permitted for a playlist's
owner and for a write collaborator, and refused for a read collaborator and for anyone with no access, who both
get the not-found answer rather than a forbidden one. Creating a playlist is permitted for any authenticated
account. Both mutations require the client header and pass the origin check.

**Blocked by:** 02.

**Status:** ready-for-agent

**Labels:** `enhancement`, `ready-for-agent`

- [ ] An owner and a write collaborator may start a sync; a read collaborator and a non-collaborator are refused with the same not-found answer.
- [ ] Any authenticated account may create a playlist.
- [ ] Both mutations require the client header and pass the origin check; a request without the header is refused.
