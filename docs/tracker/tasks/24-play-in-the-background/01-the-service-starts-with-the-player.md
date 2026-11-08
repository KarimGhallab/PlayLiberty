# 01: The service starts with the player

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

## Outcome

An app-owned Android media playback service now sits behind the player. It is declared as a `mediaPlayback` foreground
service, added by the local module's manifest, and the expo-audio plugin's own playback service is disabled so there is
one notification owner. The bridge starts it only when the player first gets a current track, mirrors one state object
into it, and stops it when the queue clears. It starts no timer, poll or wake lock.

The bridge asks for notification permission on the first playback. A refusal still starts playback and shows the one
`playerBar.notificationRefused` notice once; it does not block the service or the audio. The service creates one
low-importance, silent channel and one media-style notification. The notification carries the current track title, the
playlist as subtext (empty for a bare track), the playing track's thumbnail with the token headers, and one
play-pause action. The media session carries the same title, the playlist as artist/album, and the track artwork, so
the shade draws the playlist name below the track title. The notification id is constant, so a track change updates
the same notification.

The player store now carries the playlist's cover version and cover track as the artwork fallback when the track has
no thumbnail. The bar draws the permission-refusal notice above itself, and its copy exists in English and French.

See [`24-play-in-the-background`](../../specs/24-play-in-the-background.md).
