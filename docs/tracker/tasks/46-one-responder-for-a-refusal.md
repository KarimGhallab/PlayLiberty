# 46: One responder for a refusal, across the Playlist and Track endpoints

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

## Outcome

`apps/server/src/shared/refusal.ts` is the one responder. `Refusal` names every document the migrated routes answer with; one `Record<Refusal, ProblemInput>` owns its status, problem code, title and detail or params; `sendRefusal` renders it through `sendProblem`, so the cache header, content type and problem URL are unchanged.

The modules now declare the refusal their outcome carries. `PlaylistRefusal` holds the four playlist reasons, and each playlist function names its own at the point it asks the entry seam: the reads and the pin say `read`, rename and delete say `manage`, the settings writes say `write`, and removing a track says `track`. The track results carry their own refusal for not-found, forbidden, not-stored, not-retryable and not-fetchable, and both sync starts carry `sync_already_running` or the playlist write refusal. The outcome enums stay; ticket 47 deletes the ones nothing renders once the remaining groups move.

The Playlist and Track routes call `sendRefusal(reply, result.refusal)` and no longer choose a reason, a status or a copy. `sendPlaylistNotFound`, `sendProblem` and `ProblemCode` are gone from both route files. The batch add keeps its per-item `refused`, and the input helpers (validation, invalid request, unprocessable) are untouched.

A denial and a vanished Playlist answer the same bytes: the new route test compares the two documents directly.

See [ARCHITECTURE.md](../../ARCHITECTURE.md#layer-boundaries-normative).
