# 04: Fetch a track's artwork with its audio

**What to build:** A track's artwork appears alongside its audio. The track remembers the source thumbnail URL
that the sync read for it, and the worker fetches the image in the same pass as the audio, best effort: a
thumbnail that fails to download leaves the thumbnail path null and the track still `stored`, because a missing
picture is a cosmetic loss and a failed audio fetch is not.

**Blocked by:** 01.

**Status:** ready-for-agent

**Labels:** `enhancement`, `ready-for-agent`

- [ ] The sync stores the source thumbnail URL on the track it creates.
- [ ] A stored track gets a thumbnail path once the image is fetched.
- [ ] A thumbnail that fails leaves the path null and the track `stored`.
