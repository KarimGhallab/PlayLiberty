# Expose a playlist's access on the schema

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

## Outcome

`access` and `hasShares` are on `PlaylistSchema` and returned by both playlist routes, with an exhaustive switch in `accessFromShareLevel` forcing a new share level to be handled rather than accepted silently. Ten route tests and six contract tests cover them, including that neither route reveals a playlist the account cannot see; the schema is `packages/contracts/src/schemas.ts`.

See [`05-share-a-playlist`](../specs/05-share-a-playlist.md).
