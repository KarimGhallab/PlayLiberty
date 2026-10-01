# Add a track count to the playlist schema

Status: resolved
Labels: `enhancement`, `ready-for-agent`

## Outcome

`trackCount` is on `PlaylistSchema` and the playlist table, returned by `GET /playlists` and `GET /playlists/:id`, which this ticket implemented because no other ticket owned them. The count moves only through `addAssociation` and `removeAssociation`, each in the same transaction as the row it counts, and a hand-written migration backfills it with a test at the old schema. See [`03-read-a-playlist`](../specs/03-read-a-playlist.md) and `apps/server/src/features/playlists/associationService.ts`.

## Verification

Build, lint, test, depcruise and syncpack pass, including the migration test that seeds the pre-migration schema with raw SQL.
