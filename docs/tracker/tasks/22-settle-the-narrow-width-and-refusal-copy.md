# 22: Settle the web client's narrow width and the refusal copy

**Status:** resolved

## Outcome

The two arrangements belong to two clients: the web client at 1056 and the mobile client at 390. The web client is the row at every width it is served at: below 1056 the row narrows with the content column, the name truncates and is recoverable through its `title`, and the shared components grow their quiet controls to the 44px target under the `max-width: 767px` breakpoint; a browser that happens to be 390 wide is not the mobile client, whose 390 card grid, floating add button, full-width sheet and signed-out state those are. The refusal copy is one sentence in three places: `playlistRoutes.ts` ships `Paste a YouTube playlist link, such as https://youtube.com/playlist?list=...`, and `AddPlaylistDialog.tsx` uses the same sentence for its schema refusal, so the one slot reads the same whichever layer said no.

See [`08-see-the-library`](../specs/08-see-the-library.md).
