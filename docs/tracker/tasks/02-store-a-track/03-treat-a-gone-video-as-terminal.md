# 03: Treat a video that is gone as terminal

**Status:** resolved

## Outcome

The adapter now tells a gone video from a transient failure: `packages/youtube` gains a
`YoutubeVideoUnavailableError` and a message classifier, and the download throws the typed error when yt-dlp
reports the video unavailable rather than a rate limit or a dropped connection. The phrases stay behind the
adapter so the worker never matches tool output. Both paths that meet a gone video now share one rule,
`markTrackSourceRemoved`: it sets `sourceStatus: removed` and, for a track with no stored file,
`fileStatus: unavailable`, while a stored track keeps its file and only its source status moves. A gone track is
terminal: `unavailable` is not `pending`, so a later pass never claims it, and the sync's retry only returns
`failed` tracks to `pending`, so a sync leaves it alone.

See [`02-store-a-track.md`](../../specs/02-store-a-track.md).
