# 03: Copy a track's link from its row

**Status:** resolved

## Outcome

Every track row now opens a lane whose first item is Copy link, with the copy icon. The lane is drawn on every row, including a read-only playlist, the playing row and a row whose download, action or queue read is in flight. Those four states keep Copy link and drop the mutating items, so retry, fetch-whole and remove gain no state they did not have.

Copy link writes the absolute `/playlists/P?track=T` for that row's track, whether or not it is playing, and reports the result with a success or error toast. A browser without the Clipboard API is the error path, which is honest on the phone dev server over a plain LAN address.

See [`18-share-a-track`](../../specs/18-share-a-track.md).
