# 05: Fetch one fileless track whole

**Status:** resolved

## Outcome

The route is `POST /tracks/:id/fetch-whole`, and `fetchTrackWholeForAccount` answers `Ok`, `NotFound` or `NotEligible`. On `Ok` it writes `skipNonMusic: false`, `fileStatus: pending` and a cleared reason, returns the updated track, and kicks the download worker so the track is fetched now rather than at the next tick. Eligibility is the fileless rule: only `pending` and `failed` are accepted, while `stored`, `downloading` and `unavailable` answer `409 track_not_fetchable` and are left exactly as they were, including their `skipNonMusic`. The right follows the track like retry: `canAccountWriteTrack` is the owner of a playlist that holds the track or a write collaborator on one, and a read collaborator, a stranger, an orphan and a missing track are one `404 track_not_found`. The request has no body, and the reply is the track the retry route already returns.

See [`10-skip-non-music-parts`](../../specs/10-skip-non-music-parts.md).
