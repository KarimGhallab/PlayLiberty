# 05: Fetch one fileless track whole

**Blocked by:** [`02`](02-store-a-track-with-non-music-parts-skipped.md).
**Status:** resolved

## Outcome

Implemented and verified. The route is `POST /tracks/:id/fetch-whole`, and
`fetchTrackWholeForAccount` answers `Ok`, `NotFound` or `NotEligible`. On `Ok` it writes `skipNonMusic: false`,
`fileStatus: pending` and a cleared reason, returns the updated track, and kicks the download worker so the
track is fetched now rather than at the next tick.

- **Eligibility is the fileless rule, stated as the two states that are waiting.** Only `pending` and `failed`
  are accepted. `stored` has a shared file to protect, `downloading` is mid-fetch and moving it would race the
  worker, and `unavailable` is gone; all three answer `409 track_not_fetchable` and are left exactly as they
  were, including their `skipNonMusic`.
- **The right follows the track, like retry.** `canAccountWriteTrack` is the owner of a playlist that holds the
  track or a write collaborator on one, so a read collaborator, a stranger, an orphan and a missing track are
  one `404 track_not_found`.
- **No new contract shape.** The request has no body, and the reply is the track the retry route already
  returns.

The tests: the eligible states each flip the value and return to `pending` and kick the worker; a write
collaborator may do it; the three ineligible states are refused and unchanged; the four not-found cases; and a
missing client header. One worker test drives the whole path: the route flips a `failed` track, a worker pass
runs, and the adapter is handed `skipNonMusic: false` and stores the track.

Verification: `pnpm run test` (server 242, web 262, youtube 22, e2e 21), `pnpm run build`, `pnpm run lint` and
`pnpm run design:check` pass. No em dashes. Not committed.
