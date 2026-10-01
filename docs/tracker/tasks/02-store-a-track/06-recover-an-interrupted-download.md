# 06: Recover an interrupted download and stop cleanly

**What to build:** A restart recovers rather than repairs, and a shutdown is clean. A download interrupted by
a restart leaves a temporary file and no stored file; the startup sweep empties the temporary directory and
returns the `downloading` row to `pending`, and the next pass picks it up. Stopping the worker leaves no
download in flight and lets the server close.

**Blocked by:** 01.

**Status:** resolved

**Labels:** `enhancement`, `ready-for-agent`

- [x] The startup sweep empties the temporary directory and returns an interrupted `downloading` track to `pending`.
- [x] A download interrupted mid-flight leaves no stored file.
- [x] Stopping the worker leaves no download in flight and the server closes cleanly.

## Outcome

Implemented and verified. The startup sweep already emptied the temporary directory and returned `downloading`
rows to `pending`; this ticket pins it with tests, including that a stored track and its file are left alone
and that an interrupted download leaves no stored file.

The one real gap was the stop. The worker now tracks the pass in flight, and `stop()` clears the interval so no
new pass starts and then waits for that pass. Because a download is not abortable, a clean stop lets it finish
rather than closing the database under it, which is what makes the server close cleanly; a hard kill still
leaves only a temporary file, which the sweep reclaims on the next boot. `buildApp` awaits the stop in its
close hook.

To make that testable, the worker now takes the database, the media paths, the adapter, the concurrency and an
optional interval rather than the whole context, so a test drives it with a fake and a few-millisecond
interval. The default interval stays thirty seconds.

Verification: `pnpm run test` (108 server tests, 3 new), `pnpm run build`, `pnpm run lint`, `npx depcruise .`,
`npx syncpack lint`, `node ./scripts/validate-tsconfig-paths.cjs` and `pnpm run design:check` pass.
