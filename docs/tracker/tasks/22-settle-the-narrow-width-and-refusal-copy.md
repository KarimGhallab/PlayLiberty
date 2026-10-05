# 22: Settle the web client's narrow width and the refusal copy

**What to build:** Two drifts between the records and the web client.

1. **The narrow width has no owner.** The library record draws the app at two widths: the web client at 1056
   and the mobile client at 390, where the list is a two-column card grid with a floating add button and a
   full-width add sheet ([`library.md`](../../design-system/screens/library.md), "The mobile list is two
   columns"). The web client is responsive and renders the row list at 390, which is neither the 1056 web
   design nor the mobile client's grid. Decide whether the web client owns 390. If it does, the row
   arrangement must be specified at that width; if it does not, the records must state the client boundary
   and what the web client does below it.
2. **The refusal copy is specified but not shipped.** [`add-playlist-dialog.md`](../../design-system/components/add-playlist-dialog.md)
   says the invalid message names the host: "Paste a YouTube playlist link, such as https://youtube.com/playlist?list=..." The
   dialog surfaces the server's `detail`, which reads "The URL is not a YouTube playlist or video URL."
   ([`AddPlaylistDialog.tsx`](../../../apps/web/src/views/library/AddPlaylistDialog/AddPlaylistDialog.tsx) passes the problem
   through; [`playlistRoutes.ts`](../../../apps/server/src/features/playlists/playlistRoutes.ts) writes the
   text). Align them: change the server message, map it to the specified sentence in the dialog, or amend the
   record to the shipped wording.

**Blocked by:** None. Can start immediately.

**Status:** resolved

**Labels:** `enhancement`, `ready-for-agent`

- [x] The library records state which client owns the narrow width, or specify the web row at 390.
- [x] The refused-create copy is one decision shared by the record, the dialog and the server.

**Verification:** `node docs/design/scripts/validate-design-tokens.cjs` passes; a test asserts the refused
copy; `pnpm run build`, `pnpm run lint` and the web unit suite pass.

## Outcome

Done, and neither drift needed a control or a new arrangement.

- **The narrow width has an owner.** [`library.md`](../../design-system/screens/library.md) now says the two
  arrangements are two clients: the web client at 1056, the mobile client at 390. The 390 card grid, the
  floating add button, the full-width sheet and the signed-out state are the mobile client's (the Expo app),
  and a browser that happens to be 390 wide is not that client. The web client is the row at every width it
  is served at: below 1056 the row narrows with the content column, the name truncates and is recoverable
  through its `title`, and the shared components grow their quiet controls to the 44px target under the
  `max-width: 767px` breakpoint. It draws no grid, no floating button and no sheet.
- **The refusal copy is one sentence in three places.** [`playlistRoutes.ts`](../../../apps/server/src/features/playlists/playlistRoutes.ts)
  now ships "Paste a YouTube playlist link, such as https://youtube.com/playlist?list=...", and
  [`AddPlaylistDialog.tsx`](../../../apps/web/src/views/library/AddPlaylistDialog/AddPlaylistDialog.tsx) uses the same sentence
  for its schema refusal, so the one slot reads the same whichever layer said no; the record says so. The
  sentence is asserted by the dialog test, the library test and the server's own `POST /playlists` refusal
  test.

Verification: `node docs/design/scripts/validate-design-tokens.cjs` passes; `pnpm run build`, `pnpm run lint`
and the unit suite across all workspaces pass (server 224, web 223). The e2e spec's refused-copy assertion
was moved to the new sentence; e2e itself was not run. Not committed.
