# 01: The bar plays the queue

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

## Outcome

The store's queue still holds ids, and it now carries the metadata the bar draws: title, duration, thumbnail and the
playlist id and name when the queue came from one. `start` takes the queue's tracks and their playlist, and
`startBareTrack` holds one track with no playlist context. `isPlaying` is part of the state; `start`, `play` and an
advance with a next entry begin playing, while the end of the queue and the last dropped entry stop it.

The audio layer is one `useAudioPlayer` rather than a native playlist. It derives the current track's address when the
track is reached, replaces only that source, plays or pauses with the store, and clears the source when the queue
stops. A finished track advances once; a second render of the same finish pulse does not advance again. A resolver
change, such as a new credential, reloads the current track.

The bar is mounted once in the shell and survives navigation. It draws the artwork, the title and the playlist name,
with one play-pause control whose label names the track. It is absent when there is no current track. A playlist's
artwork opens that playlist; a bare queue draws the title only, with no playlist name and no artwork link.

The bar's height is paid under the last row of the gallery and the detail while it is present. The two add actions,
the detail's snackbar and the notices clear it. The new copy exists in both catalogs, and the device was left in
French.

See [`23-play-stored-audio`](../../specs/23-play-stored-audio.md).
