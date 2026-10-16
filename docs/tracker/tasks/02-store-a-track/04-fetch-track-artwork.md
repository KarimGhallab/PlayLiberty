# 04: Fetch a track's artwork with its audio

**Status:** resolved

## Outcome

A track now remembers the source thumbnail URL the sync read for it (new nullable `thumbnail_url` column,
migration `0004`), and the adapter gains `fetchThumbnail`, so the image fetch stays behind the same seam as the
audio rather than reaching the CDN from the worker. The sync stores the URL only on a track it creates; an
existing track keeps its metadata. After the worker stores the audio it fetches the image, best effort: on
success it records `thumbnailPath`, and a thumbnail that fails logs a warning and leaves the path null while the
track stays `stored`. The picture is fetched only on the success path, so a failed or gone download never leaves
artwork without a track.

See [`02-store-a-track.md`](../../specs/02-store-a-track.md).
