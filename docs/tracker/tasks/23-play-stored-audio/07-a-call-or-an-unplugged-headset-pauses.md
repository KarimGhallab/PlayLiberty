# 07: A call or an unplugged headset pauses

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

## Outcome

The player's own status now drives the bar's play state. Once a source has been observed playing, a settled status of
not playing pauses the store, and a later playing status resumes it; the platform owns the focus and the resume, so a
transient focus loss resumes and a listener's pause does not. A buffering gap and the first not-playing status after a
source loads are ignored, so starting a track is not cancelled by its own loading state.

`setPlaying` no longer writes when the state already agrees and there is no failure notice to clear, so the status
mirror does not churn the store. expo-audio keeps the audio mode at `doNotMix`, which owns focus loss and the
headphone-disconnect stop on the platform side. The notification, lock screen and background service remain spec
`24`'s.

See [`23-play-stored-audio`](../../specs/23-play-stored-audio.md).
