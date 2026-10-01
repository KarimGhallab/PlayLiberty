# 02: Resync a playlist without duplicating

**What to build:** A listener can refresh an existing playlist. Starting a sync on a playlist they own or
write to reads the source again and reconciles it: a video already associated stays exactly where it is, a
video new to the source is appended after it, and running the same sync twice changes nothing the second
time. Re-pasting a source the listener already synced returns the existing playlist and starts a run rather
than creating a second. While a run is in flight, a second request is refused rather than queued.

**Blocked by:** 01.

**Status:** ready-for-agent

**Labels:** `enhancement`, `ready-for-agent`

- [ ] Starting a sync on an existing playlist answers `202` with a run in `running`.
- [ ] A video already associated is left exactly as it is, including its position and its metadata, and a video new to the source is appended after it.
- [ ] Running the same sync twice changes nothing the second time.
- [ ] Re-pasting a source the caller already synced returns the existing playlist and starts a run, not a second playlist.
- [ ] A second sync while one is in flight answers `409` with a problem document.
