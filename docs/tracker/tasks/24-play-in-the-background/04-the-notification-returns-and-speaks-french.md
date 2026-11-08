# 04: The notification returns and speaks French

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

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

See [`24-play-in-the-background`](../../specs/24-play-in-the-background.md).
