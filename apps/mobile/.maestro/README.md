# Mobile journeys

Maestro flows for the shell's critical journeys. One flow per journey, each establishing its own starting state.

## Prerequisites

- `maestro` on the PATH, Java 17 or newer, and `adb` with the emulator running.
- Metro serving the app, the server on `8080`, and the Vite dev proxy on `5173`.
- The dev proxy provisions without a credential, so a flow that starts signed out signs itself back in through the
  browser. No account is typed.

## Run

```sh
PATH="$HOME/.maestro/bin:$PATH" \
  maestro test -e SOURCE_URL=<source> -e OWNED_PLAYLIST=<owned playlist> apps/mobile/.maestro
```

The add flow takes its playlist link from `SOURCE_URL`. The remove flow takes its playlist name from
`OWNED_PLAYLIST`, which must name a playlist the signed-in account owns so Remove is offered; the name keeps the
flow independent of gallery order and of a shared first card. The flows are independent, so any order works.
`signed-out` leaves the device signed out; the other flows sign in first when they need to. `provisioning` starts from
either state and leaves the device signed in.

## The flows

| Flow                  | Journey                                                                  |
| --------------------- | ------------------------------------------------------------------------ |
| `gallery-card`        | the gallery opens and a card reaches its playlist                        |
| `gallery-add`         | a playlist is added from the floating action and appears under Syncing   |
| `gallery-pin`         | a playlist is pinned from its card and the Pinned heading appears        |
| `detail-play`         | a row plays and its own row says it is playing                           |
| `detail-filter`       | the failed chip draws its body, then All brings the whole list back      |
| `detail-remove-undo`  | Remove defers, Undo restores the row, and the device ends in the gallery |
| `library-and-account` | the app opens on the library, the account sheet opens and closes         |
| `signed-out`          | signing out leaves one action and nothing else                           |
| `language`            | French survives a kill and relaunch, then English is restored            |
| `provisioning`        | a signed-out app signs in and the token survives a relaunch              |

## Why a point on the account door

The development client draws a floating gear over the top right of the app, and its touch area covers the centre of
the account door. The flows tap the left tenth of the door instead, which is why the `tapOn` for `account-door`
carries a `point`.

## Why the detail flows move by hand

The status chips sit on one horizontal rail, so `scrollUntilVisible` scrolls the page under it rather than the rail.
The filter flow swipes the chip row twice to reach Failed and twice back to All. Remove and Undo live in a six-second
window, so those taps set `waitToSettleTimeoutMs: 0`; a settle wait can outlast the window and let the removal
commit before Undo lands.

## Scope

These flows cover the shell, the gallery's three critical journeys, the detail's three, and the provisioning
journey. The track link belongs to `30`, the egress console to `31`, and streaming to `23`; each of those specs
owns its own journey.
