# 22: Settle the web client's narrow width and the refusal copy

**Blocked by:** None. Can start immediately.
**Status:** resolved

## Outcome

Done, and neither drift needed a control or a new arrangement.

- **The narrow width has an owner.** The library design now says the two
  arrangements are two clients: the web client at 1056, the mobile client at 390. The 390 card grid, the
  floating add button, the full-width sheet and the signed-out state are the mobile client's (the Expo app),
  and a browser that happens to be 390 wide is not that client. The web client is the row at every width it
  is served at: below 1056 the row narrows with the content column, the name truncates and is recoverable
  through its `title`, and the shared components grow their quiet controls to the 44px target under the
  `max-width: 767px` breakpoint. It draws no grid, no floating button and no sheet.
- **The refusal copy is one sentence in three places.** [`playlistRoutes.ts`](../../../apps/server/src/features/playlists/routes/playlistRoutes.ts)
  now ships "Paste a YouTube playlist link, such as https://youtube.com/playlist?list=...", and
  [`AddPlaylistDialog.tsx`](../../../apps/web/src/views/library/AddPlaylistDialog/AddPlaylistDialog.tsx) uses the same sentence
  for its schema refusal, so the one slot reads the same whichever layer said no; the design says so. The
  sentence is asserted by the dialog test, the library test and the server's own `POST /playlists` refusal
  test.

Verification: `pnpm run build`, `pnpm run lint`
and the unit suite across all workspaces pass (server 224, web 223). The e2e spec's refused-copy assertion
was moved to the new sentence; e2e itself was not run. Not committed.
