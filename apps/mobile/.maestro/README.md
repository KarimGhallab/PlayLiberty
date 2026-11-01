# Mobile journeys

Maestro flows for the app's critical journeys. One flow per journey, each establishing its own starting state.

## Prerequisites

- `maestro` on the PATH, Java 17 or newer, and `adb` with the emulator running.
- Metro serving the app, the server on `8080`, and the Vite dev proxy on `5173`.
- The dev proxy provisions without a credential, so a flow that starts signed out signs itself back in through the
  browser. No account is typed.

## Run

```sh
PATH="$HOME/.maestro/bin:$PATH" \
  maestro test -e SOURCE_URL=<source> -e OWNED_PLAYLIST=<owned playlist> \
  -e VIDEO_URL=<video> -e VIDEO_TITLE=<title> -e SHARE_ACCOUNT=<second account> \
  apps/mobile/.maestro
```

The playlist-add flow takes its playlist link from `SOURCE_URL`. The batch flow takes one video from `VIDEO_URL`
and its resolved title from `VIDEO_TITLE`, then adds it to `OWNED_PLAYLIST` and the next writable playlist in the
sheet. The share flow takes the name of a second account from `SHARE_ACCOUNT`, which must not be the signed-in owner
of `OWNED_PLAYLIST`. The remove, player, batch and share flows take their playlist name from `OWNED_PLAYLIST`, which
must name a playlist the signed-in account owns with at least three playable tracks; the name keeps them independent
of gallery order and of a shared first card. The flows are independent, so any order works.
`signed-out` leaves the device signed out; the other flows sign in first when they need to. `provisioning` starts from
either state and leaves the device signed in. The pin flow takes `PIN_PLAYLIST`, which must name an unpinned playlist;
it finds that card by name in the rest group and leaves it unpinned when it ends. The track-link flow takes
`PLAYLIST_ID`, `TRACK_ID` and `TRACK_TITLE`; the title names the track in the bar and its row, so keep it simple
enough to be a selector. Pick a track above the playlist's last row and long enough for the copy, because the last
row's lane can sit under the player bar.

## The cover fixture

The cover flow takes the first tile in the system photo picker. Push a photo as the newest image before the run, so
the first tile is the known fixture:

```sh
cp .github/assets/readme/02-playlist.webp /tmp/playliberty-cover-fixture.webp
touch /tmp/playliberty-cover-fixture.webp
adb -s emulator-5554 push /tmp/playliberty-cover-fixture.webp \
  /sdcard/Pictures/playliberty-cover-fixture.webp
adb -s emulator-5554 shell am broadcast -a android.intent.action.MEDIA_SCANNER_SCAN_FILE \
  -d file:///sdcard/Pictures/playliberty-cover-fixture.webp
```

`touch` makes the copy newer than the library's other photos, so the picker draws it first.

## The physical background journey

`../.maestro-device/background-journey.yaml` is the device-only driver for the screen-off track change. It starts
`OWNED_PLAYLIST` at its fourth playable row, waits for the bar and locks the screen. It is not part of `pnpm e2e`,
because it leaves the phone locked and needs a playlist whose fourth playable track is short.

```sh
PATH="$HOME/.maestro/bin:$PATH" \
  maestro test --udid <phone> -e OWNED_PLAYLIST=Paradis apps/mobile/.maestro-device/background-journey.yaml
```

Wait for the current track to finish, then read the notification and media session with `adb -s <phone> shell dumpsys
notification` and `adb -s <phone> shell dumpsys media_session`. Wake the phone with `adb -s <phone> shell input keyevent
224` to inspect the lock screen.

## The flows

| Flow                  | Journey                                                                  |
| --------------------- | ------------------------------------------------------------------------ |
| `gallery-card`        | the gallery opens and a card reaches its playlist                        |
| `gallery-add`         | a playlist is added from the floating action and appears under Syncing   |
| `gallery-pin`         | a card is pinned, moves under Pinned, and is unpinned again              |
| `gallery-cover`       | a cover is chosen, framed, saved, seen again and removed                 |
| `link-track`          | a track link opens its playlist at the track and copies it               |
| `detail-play`         | a row plays and its own row says it is playing                           |
| `detail-arrange`      | the sort round-trips, Failed draws its body, then All returns the list   |
| `detail-remove-undo`  | Remove defers, Undo restores the row, and the device ends in the gallery |
| `detail-add-batch`    | a video is added to two playlists, removed and restored                  |
| `detail-share`        | a playlist is shared at read, changed to write, then revoked             |
| `player-journey`      | a queue plays, advances, jumps from a row, and the bar survives a back   |
| `library-and-account` | the app opens on the library, the account sheet opens and closes         |
| `signed-out`          | signing out leaves one action and nothing else                           |
| `language`            | French survives a kill and relaunch, then English is restored            |
| `provisioning`        | a signed-out app signs in and the token survives a relaunch              |

## Why a point on the account door

The development client draws a floating gear over the top right of the app, and its touch area covers the centre of
the account door. The flows tap the left tenth of the door instead, which is why the `tapOn` for `account-door`
carries a `point`.

## Why the track-link flow opens a URL

The flow proves the link, not a tap that happens to reach the same screen, so it opens the scheme URL after the app is
warm. The dev client's launcher takes a cold custom-scheme intent, so the flow launches and signs in first and only
then opens the link.

## Why the cover flow taps the picker by point

The system photo picker is not the app: its labels belong to the system and its grid depends on the device. The flow
taps the first tile by point instead, and the fixture is pushed as the newest image so the first tile is known.
Everything after the picker is found by an app id.

## Why the pin flow names its card

The pinned section is one sideways row, so the flow cannot reopen a card by its group index: pinning the first rest
card would make the named card a different one. It addresses the named card through the group-qualified actions id
and the card's own name, and one sideways sweep at 33% height brings the later cards of the row into view.

## Why the detail flows move by hand

The sort and the chips share one rail below the header, so `scrollUntilVisible` would scroll the page under the rail
rather than the rail itself. The arranging flow swipes the chip rail twice to reach Failed and twice back to All.
Remove and Undo live in a six-second window, so those taps set `waitToSettleTimeoutMs: 0`; a settle wait can outlast
the window and let the removal commit before Undo lands. The track-link flow's copy confirmation is a four-second
notice, so its copy tap sets the same timeout.

The batch flow checks the second checkbox in the add sheet. The current playlist is first and preselected, so index
1 is the next writable playlist on the gallery's first page. A clean batch closes the sheet; a refusal would keep it
open with one outcome row per chosen playlist.

The share flow finds a share row by `SHARE_ACCOUNT` and the picker's level controls by their ids, never by copy, so
it survives either app language. The picker leaves the signed-in owner out, shows an account that already holds the
playlist with its level selected, and appends directory pages as the list reaches its end.

## Scope

These flows cover the shell, the gallery's four critical journeys, the detail's five, the player's journey, and
the provisioning journey. The screen-off background journey is the device-only driver in `../.maestro-device`; it
leaves the phone locked, so it is run separately. The track link belongs to `30` and the egress console to `31`; each
of those specs owns its own journey.
