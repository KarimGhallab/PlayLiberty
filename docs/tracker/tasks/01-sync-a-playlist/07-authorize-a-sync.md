# 07: Authorize a sync

**What to build:** The two mutating routes enforce who may act. Starting a sync is permitted for a playlist's
owner and for a write collaborator, and refused for a read collaborator and for anyone with no access, who both
get the not-found answer rather than a forbidden one. Creating a playlist is permitted for any authenticated
account. Both mutations require the client header and pass the origin check.

**Blocked by:** 02.

**Status:** resolved

**Labels:** `enhancement`, `ready-for-agent`

- [x] An owner and a write collaborator may start a sync; a read collaborator and a non-collaborator are refused with the same not-found answer.
- [x] Any authenticated account may create a playlist.
- [x] Both mutations require the client header and pass the origin check; a request without the header is refused.

## Outcome

Verified, with no production change. The owner-or-write gate on the resync route, where a read collaborator and
a stranger both answer not-found, shipped with ticket 02. The client header and origin checks are the global
CSRF hook from the scaffold, which covers both mutations, so the resync route needed no check of its own.

Four tests pin it: an owner and a write collaborator each start a sync while a read collaborator and a stranger
both get the same `playlist_not_found`; a brand-new account creates a playlist, owns it, and no one else sees
it; a sync without the client header is refused; and a sync from a foreign origin is refused when a public
origin is configured. Shares are seeded directly, because the three share routes (spec 05) are still stubs.

Verification: `pnpm run test` (89 server tests, 4 new), `pnpm run build`, `pnpm run lint`, `npx depcruise .`,
`npx syncpack lint`, `node ./scripts/validate-tsconfig-paths.cjs` and `pnpm run design:check` pass.
