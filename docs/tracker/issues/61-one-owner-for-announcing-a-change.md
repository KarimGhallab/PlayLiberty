# 61: One owner for announcing a change

**State:** `resolved`
**Category:** `enhancement`

## Outcome

`liveEvents` keeps its four publishers and gains the one seam from a committed change to its event: `ChangeKind` names what changed, and `announce` maps it to the publisher. Only `announce` calls a publisher now, and no route module imports one.

Each committing module announces its own write: `playlistService` (rename, skip-non-music, sort, delete, track removal), `shareService` (grant and revoke), `trackService` (retry and fetch-whole), `addTrackToPlaylists`, and `syncService`. The download worker's four transitions go through the same seam. The change is built from the outcome the service already holds, so the seam re-reads nothing; delete reads the audience before the row goes, because it cannot be read after. A refusal returns before `announce`, so a failed or refused write says nothing.

`liveEvents.test.ts` covers a refused rename, track removal, share grant and retry beside the success cases, and the events a listener receives are unchanged.
