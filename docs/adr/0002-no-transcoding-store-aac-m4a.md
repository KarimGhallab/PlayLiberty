# Prefer AAC/M4A and never transcode

PlayLiberty stores YouTube's own audio stream as-is and never transcodes. The stream is chosen at download time and served verbatim with `Content-Type: audio/mp4`. The server runs no encoder and keeps no transcode cache.

The download asks for the AAC stream first, so a video that has one is stored as AAC in an M4A container: about 128kbps, plays everywhere, and is seekable from the first byte. A video with no AAC stream is stored as the Opus stream YouTube does offer rather than refused, because the alternative to a playable file in the wrong container is no file at all. AAC is the preference, not a hard requirement. The Opus fallback carries a real caveat: Safari and some mobile players cannot be relied on to play it, and there is no transcoder to bridge that gap.

Because there is no transcoding, the stored stream is effectively the playback contract, which is why the choice is recorded here.

Alternatives rejected:

- Opus always: better ratio and fidelity, but Safari and some mobile players cannot be relied on, and there is no transcoder to bridge the gap.
- Refusing a video with no AAC stream: costs the listener a track over a container preference, when the Opus file still plays on the web client and most of the mobile surface.
- Transcode at download time: centralizes the cost but is still lossy and still commits to a format, adding a slow step for no compatibility gain over AAC.
- Transcode on the fly: reverses the no-transcoding non-goal and adds ffmpeg to the hot path, with a cache to invalidate and more failure modes.
