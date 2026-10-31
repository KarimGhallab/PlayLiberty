# 04: The notification returns and speaks French

**Status:** ready-for-agent
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [`01`](01-the-service-starts-with-the-player.md)

## What to build

Tapping the notification returns the listener to the screen they left, not to the gallery. The service carries the
current route and asks the app to resolve it on return, so an open playlist stays open and the bar remains.

The notification's actions, channel and transport labels are in the app's language, as are the track and playlist it
draws. A bare queue reveals no playlist name. Screen-reader users hear each control's name and the current track, not
an icon or an English default.

The notification's copy follows a language change without waiting for a track change.

## Acceptance criteria

- [ ] Tapping the notification from another app returns to the screen the listener left.
- [ ] The open screen and the bar are unchanged by the return.
- [ ] Every visible notification label exists in English and French.
- [ ] A language change updates the notification's copy.
- [ ] A bare queue reveals no playlist name.
- [ ] Every notification control has a screen-reader label naming its action and track.

## Verification

- Mapping tests cover the route carried by the notification, the English and French copy, the bare subtitle and the
  control labels.
- On the device: leave the app on a playlist, open another app, tap the notification and confirm the playlist is still
  open; switch the app to French and inspect the shade.
- `pnpm --filter @playliberty/mobile run typecheck`, `pnpm run lint:check` and `pnpm run build` pass.

See [`24-play-in-the-background`](../../specs/24-play-in-the-background.md).
