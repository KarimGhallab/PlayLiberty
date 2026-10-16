# The add-a-track control

**Status:** resolved

## Outcome

Landed. The control sits in the way-home row of `PlaylistDetailPage`, top-right, for the owner and a `write` collaborator and absent for a `read` one; the page reads the library (`usePlaylists`) and derives the writable playlists, so a playlist the account cannot write to is absent rather than disabled. The row is `space-between` and holds the same accent pill, the same `plus` and the label "Add a track", named for the glossary's reason: a track is what the server stores and a video is its source, while the dialog's field takes a video URL. The control sits outside the overflow because adding a track is the one curating action every writable account has and the most frequent thing done on the screen, and `PlaylistDetailPage.test.tsx` asserts the owner sees the control and it opens the dialog while a read collaborator sees neither the overflow nor the control.

See [`04-curate-a-playlist`](../../specs/04-curate-a-playlist.md).
