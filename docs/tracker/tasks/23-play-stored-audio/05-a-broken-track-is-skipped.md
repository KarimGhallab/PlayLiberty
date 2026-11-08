# 05: A broken track is skipped and a refusal is explained

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

## Outcome

A load failure is classified by re-asking the stream route: `404` is gone, `401` is the session, and anything else is
unknown. Only an error from a source that had loaded is read as this track's failure, so a stale error from the
previous source is not applied to the new one, and a classification that resolves after the playhead moved does
nothing.

A gone entry is dropped and the next one continues; dropping the last entry stops playback and removes the bar. A
session refusal clears the player and expires the session instead of drawing a broken track. An unknown refusal pauses
on the track and records it, so the bar draws a notice naming the track and saying playback failed, with the queue
left in place for another press. A successful retry or a move clears the notice.

The stream classifier lives in its own module so the audio layer receives one function from the shell. The notice copy
exists in both catalogs. The device check also confirmed that expo-audio rejects `replace(null)`; stopping now pauses
and leaves the source loaded until the next track replaces it.

See [`23-play-stored-audio`](../../specs/23-play-stored-audio.md).
