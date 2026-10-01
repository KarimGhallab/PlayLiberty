# 06: Recover an interrupted download and stop cleanly

**What to build:** A restart recovers rather than repairs, and a shutdown is clean. A download interrupted by
a restart leaves a temporary file and no stored file; the startup sweep empties the temporary directory and
returns the `downloading` row to `pending`, and the next pass picks it up. Stopping the worker leaves no
download in flight and lets the server close.

**Blocked by:** 01.

**Status:** ready-for-agent

**Labels:** `enhancement`, `ready-for-agent`

- [ ] The startup sweep empties the temporary directory and returns an interrupted `downloading` track to `pending`.
- [ ] A download interrupted mid-flight leaves no stored file.
- [ ] Stopping the worker leaves no download in flight and the server closes cleanly.
