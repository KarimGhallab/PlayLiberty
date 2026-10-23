# 94: The gallery cannot show only the playlists shared with the account

**State:** `resolved`
**Category:** `enhancement`

**Blocked by:** None. Can start immediately.

## Outcome

A gallery that holds a playlist shared with the account now leads its filter rail with the ownership scope: `All` and `Shared with me`, each with its playlist count, a divider, then the file-status chips. The scope is the account's own view of the gallery, not a track state, so it filters `access !== 'owner'` before anything else; the status counts then read over the scope, and the status All is named as tracks while the pair is drawn, so the two Alls never count different things. The pair is absent when nothing is shared, and a live read that loses the last share returns the scope to All rather than leaving an empty gallery with no control to leave it.

The pair is the shape the prototype settled: a two-way switch with a measured thumb that travels and resizes between the two labels, taking the shared role's surface and boundary while the shared side is in force. The shared glyph is the same person-share mark the cards draw, so the control and the shared items speak the same language. On a phone the pair takes the first line and the status chips take their own line; on the web they share one row. The bulk sync follows both filters, so a shared scope narrows `Sync all N playlists` to the writable playlists in it; a read share stays excluded.

`PlaylistFilterChips` gained an optional `allLabelKey`; the library passes `library.allTracks` only while the pair is drawn. The four `library.*` keys replace the prototype namespace, and the ownership scope uses the `--shared` role added for the share surfaces. The prototype folder, its fixtures, its colour switcher and the `?prototype=shared` gate are gone; the filter is the real page.

Verification: the page tests hold the scope narrowing the gallery, the status counts following it, a status that the scope does not carry resetting to All, the pair's absence without a share, and the bulk sync's count following the scope; the chips test holds the All label override. `pnpm run build`, `pnpm run lint` and the unit suites pass (web 566, server 381, tokens 2). The real instance has one account and no share, so the pair was checked against a stubbed three-playlist dataset in the production build (one owned, one read share, one write share): both scopes at desktop and 390 touch, the thumb landing flush on the active segment, the shared tint and the owner line, `Sync all 2 playlists` narrowing to `1 playlist`, and the status counts dropping from 3 to 2. The e2e suite was not run here because it needs the full instance; its shared scenarios (the pinned share, the cover collaborators, the live grant and revoke, the share journey) will now draw the pair, and no existing spec queries the labels it adds.
