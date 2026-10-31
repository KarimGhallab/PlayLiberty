# 01: The service starts with the player

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** None. Can start immediately.

## Outcome

An app-owned Android media playback service now sits behind the player. It is declared as a `mediaPlayback` foreground
service, added by the local module's manifest, and the expo-audio plugin's own playback service is disabled so there is
one notification owner. The bridge starts it only when the player first gets a current track, mirrors one state object
into it, and stops it when the queue clears. It starts no timer, poll or wake lock.

The bridge asks for notification permission on the first playback. A refusal still starts playback and shows the one
`playerBar.notificationRefused` notice once; it does not block the service or the audio. The service creates one
low-importance, silent channel and one media-style notification. The notification carries the current track title, the
playlist as subtext (empty for a bare track), the artwork from the playlist cover, cover track or track thumbnail with
the token headers, and one play-pause action. The media session carries the same title, playlist album and artwork.
The notification id is constant, so a track change updates the same notification.

The player store now carries the playlist's cover version and cover track, so the service can choose the artwork on a
track change. The bar draws the permission-refusal notice above itself, and its copy exists in English and French.

## Verification

- Mobile 368 tests across 43 suites pass. Tests cover the state mapping (title, playlist, bare subtitle, artwork
  choice, headers), the bridge start/stop, the command toggle and the refusal notice.
- `pnpm --filter @playliberty/mobile run typecheck`, `pnpm run lint:check` and `pnpm run build` pass.
- The Android module compiled with `:app:assembleDebug`, the rebuilt client installed, and the first play showed the
  permission prompt.
- On the emulator the notification used channel `playliberty_playback` with name `Lecteur`, importance LOW, silent and
  one play-pause action. It showed the track title, `Chine` as subtext and a bitmap artwork. The media session metadata
  carried the title, the playlist album and the artwork.
- Pausing and resuming from the shade changed the action between `Mettre en pause` and `Lire`. Six seconds with the
  screen off advanced the audio from 1:33 to 2:03. A track change kept the same notification id and replaced its title.
- No notification existed before the first play.

See [`24-play-in-the-background`](../../specs/24-play-in-the-background.md).
