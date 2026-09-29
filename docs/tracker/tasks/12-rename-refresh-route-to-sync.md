# Rename the manual sync route from /refresh to /sync

Status: resolved
Labels: `enhancement`

## Outcome

Renamed. `POST /playlists/:id/sync` in `apps/server/src/playlists/playlistRoutes.ts`, and the handler
message is now `Syncing a playlist is not implemented yet.`, which puts it in the same voice as the
seven sibling routes rather than leaving the one word that was out of step in both the path and the
sentence.

The ripple was the route file alone, as the scope predicted. A sweep of `apps/` and `packages/` found no
caller, no test and no client that builds the path, so nothing else needed touching. Two `refresh`
occurrences survive the rename and both are correct: a comment in `authService.ts` about re-reading
display fields, and the pinned `refresh` glyph in the icon specimen, which is deliberately not the sync
action's glyph and is documented as such.

The empty state record in `docs/design-system/components/empty-state.md` states the trigger as
`POST /playlists/:id/sync`, and that statement is now true rather than aspirational.

## Objective

`POST /playlists/:id/refresh` is the only place in the codebase that still says `refresh` for the
manual sync trigger. Every other surface, every specimen and the glossary already say `sync`, so the
route is the single contradiction and a reader following the prose into the server finds a different
word. Rename the path segment to `sync` and bring the handler's own wording with it.

The user-facing label stays `Sync now`. The glossary term is `sync`. Only the path segment changes:
`sync` names the action and its trigger, and the route is that trigger.

## Scope

- `apps/server/src/playlists/playlistRoutes.ts`: the path segment on the `app.post` registration, and
  the `sendNotImplemented` message, which currently reads "Refreshing a playlist is not implemented
  yet."
- Any caller, test or client that builds the path. A search of `apps/` and `packages/` found exactly
  one occurrence of the string in either tree, so the ripple is the route file itself. Re-verify
  before editing rather than trusting that number, since the tree will have moved.
- `docs/`: a sweep should find no `refresh` in the `/api/v1` sense. Note that
  `apps/server/src/auth/authService.ts` also uses "refresh" and is unrelated: it means re-reading
  display fields, not re-syncing. Leave it.

## Do not

- Do not rename the `Sync now` button label. The label says what the control does and the domain
  term is `sync`; shortening it to a bare `Sync` is a separate decision that was considered and left
  as shipped.
- Do not touch `refresh-cw` or any token, key or field that uses the word for a different meaning.
  The rename is one path segment.
- Do not implement the handler. It still returns `sendNotImplemented` and this ticket is about the
  path, not the work.

## Verification

`grep -rn "playlists/:id/refresh" apps packages docs` returns nothing, and
`grep -rn "playlists/:id/sync" apps` returns the route. Then `pnpm run build` and `pnpm run lint`.

Once this lands, the empty state record in `docs/design-system/components/empty-state.md` states
the route as `/sync` and the statement is true.
