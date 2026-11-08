# 04: Move the optimistic patch into the query package

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

## Outcome

`@playliberty/query` now exports `optimisticPatch`, `restoreOptimistic`, `OptimisticContext`, `pinPlaylistInPage`, `pinPlaylistInPages` and `insertPlaylistInPages`. The pin, the skip switch and the sort in `@playliberty/api-client` call the shared patch and restore; the client package's private copy is deleted, and no mutation cancels, snapshots or restores by hand. The pin patches every loaded library page, so a refusal restores all of them from the one snapshot.

The package suite proves the cancel, the snapshot, the apply and the restore, that an absent read stays absent, and that the pin patches every page. The created-row insertion moved with the patchers, and its callers in `api-client` import it from `query`.
