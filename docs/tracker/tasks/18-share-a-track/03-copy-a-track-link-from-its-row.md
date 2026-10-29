# 03: Copy a track's link from its row

**Status:** resolved

## Outcome

Every track row now opens a lane whose first item is Copy link, with the share icon. The lane is drawn on every row, including a read-only playlist, the playing row and a row whose download, action or queue read is in flight. Those four states keep Copy link and drop the mutating items, so retry, fetch-whole and remove gain no state they did not have.

Copy link writes the absolute `/playlists/P?track=T` for that row's track, whether or not it is playing, and reports the result with a success or error toast. A browser without the Clipboard API is the error path, which is honest on the phone dev server over a plain LAN address.

Verification: `pnpm run build`, `pnpm run lint:check`, the unit suites (web 630, server 436, egress agent 54, UI foundation 5) and the e2e typecheck pass. The row tests cover the universal lane, the first item, the copy call and the four gated states. The playlist detail page tests cover the absolute URL and both toasts with the Clipboard API stubbed. No e2e is added: the system clipboard is not portable across the three engines, and the spec puts the copy at the page test.

See [`18-share-a-track`](../../specs/18-share-a-track.md).
