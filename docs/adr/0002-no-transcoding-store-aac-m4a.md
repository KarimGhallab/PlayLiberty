# Store AAC/M4A and never transcode

PlayLiberty stores the AAC/M4A stream from YouTube as-is and never transcodes. The format is fixed at download time and served verbatim with `Content-Type: audio/mp4`. The server runs no encoder and keeps no transcode cache.

The product must play on a browser and on mobile with the simplest possible server. YouTube offers both an Opus stream (better ratio, unreliable Safari support) and an AAC stream (about 128kbps, plays everywhere). Choosing the AAC stream buys universal playback with no encoder, so the server stays a file server. Because there is no transcoding, the stored format is effectively the playback contract, which is why the choice is recorded here.

Alternatives rejected:

- Opus: better fidelity, but Safari and some mobile players cannot be relied on, and there is no transcoder to bridge the gap.
- Transcode at download time: centralizes the cost but is still lossy and still commits to a format, adding a slow step for no compatibility gain over AAC.
- Transcode on the fly: reverses the no-transcoding non-goal and adds ffmpeg to the hot path, with a cache to invalidate and more failure modes.
