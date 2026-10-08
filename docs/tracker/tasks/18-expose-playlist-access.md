# Expose a playlist's access on the schema

Status: resolved
Labels: `enhancement`, `ready-for-agent`

## Outcome

`access` and `hasShares` are on `PlaylistSchema` and returned by both playlist routes, with an exhaustive switch in `accessFromShareLevel` forcing a new share level to be handled rather than accepted silently. Ten route tests and six contract tests cover them, including that neither route reveals a playlist the account cannot see. See [`03-read-a-playlist`](../specs/03-read-a-playlist.md), [`05-share-a-playlist`](../specs/05-share-a-playlist.md) and `packages/contracts/src/schemas.ts`.

## Verification

Build, lint and test pass, including the N+1 test that counts statements for a page of one against a page of six.
