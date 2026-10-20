# 02: A track's download state reaches the playlist detail

**Status:** resolved

## Outcome

The worker is the second publisher on the bus, and a track's state is the second thing the client reacts to. `track.changed` carries `playlistIds` and nothing else, so the client invalidates each playlist that holds the track and never one that does not, with the audience resolved by `trackAudience` in one join over the playlists holding the track and the accounts that can see any of them. The worker publishes at each transition it owns: when it claims a track, when it stores one, when a download fails, and when a video is gone. The stored publish is after the artwork fetch so one refetch carries the stored row and its picture, and a failed artwork still publishes because the audio is what makes the track playable.

See [`09-keep-the-screens-current`](../../specs/09-keep-the-screens-current.md).
