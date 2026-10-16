# 07: Authorize a sync

**Blocked by:** 02.
**Status:** resolved

## Outcome

Verified, with no production change. The owner-or-write gate on the resync route, where a read collaborator and
a stranger both answer not-found, shipped with ticket 02. The client header and origin checks are the global
CSRF hook from the scaffold, which covers both mutations, so the resync route needed no check of its own.

Four tests pin it: an owner and a write collaborator each start a sync while a read collaborator and a stranger
both get the same `playlist_not_found`; a brand-new account creates a playlist, owns it, and no one else sees
it; a sync without the client header is refused; and a sync from a foreign origin is refused when a public
origin is configured. Shares are seeded directly, because the three share routes (spec 05) are still stubs.

Verification: `pnpm run test` (89 server tests, 4 new), `pnpm run build`, `pnpm run lint`, `npx depcruise .`,
`npx syncpack lint`, `node ./scripts/validate-tsconfig-paths.cjs` pass.
