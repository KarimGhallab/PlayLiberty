# 04: The notification returns and speaks French

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [`01`](01-the-service-starts-with-the-player.md)

## Outcome

The bridge now carries the current `usePathname()` route into the service. The service builds the notification's
content intent from it, and uses the same pending intent as the media session's session activity, so both the shade
and the lock screen return to the screen the listener left. The route is part of the notification key, so navigating
to another screen rebuilds the intent. The gallery route keeps the app launch intent; a deeper route becomes a
`dev.playliberty.app://` link.

Every notification action label now names both the action and the current track, using the existing named transport
copy: for example `Piste précédente, Makafushigi Adventure Instrumental Full Version`. The channel name, play, pause,
previous and next labels all come from the app's translator, so they follow the selected language. A language change
changes the label state, which changes the notification key and rebuilds the notification and channel. A bare queue
passes an empty playlist name, so no subtitle or artist line is drawn.

## Verification

- Mobile 373 tests across 43 suites pass. Mapping tests cover the route, English and French labels, the named actions
  and the empty bare subtitle. A hook test proves the French labels and route reach the service.
- `pnpm --filter @playliberty/mobile run typecheck`, `pnpm run lint:check` and `pnpm run build` pass.
- The Android module compiled with `:app:assembleDebug` and the rebuilt client installed.
- On the French device, the notification actions read `Piste précédente, ...`, `Mettre en pause ...` and
  `Piste suivante, ...`, with the track title in each. The media metadata carried the title, playlist artist and
  album.
- Leaving the app on `Chine`, opening the home screen, and tapping the media card returned to `Chine` with the bar
  still visible.

See [`24-play-in-the-background`](../../specs/24-play-in-the-background.md).
