# 02: Stop a prune cleanly

**What to build:** A prune in flight stops when the server is asked to close, without leaving a track half
removed and without holding the shutdown open for the whole media store. The run is handed a signal and stops
claiming new tracks once it is set, so the tracks it has not reached are left for the next run or for the
startup sweep rather than being forced through; a track it is already deleting finishes that deletion. The close
hook sets the signal and stops the clock, so a shutdown during a cleanup leaves the instance converging on its
own.

**Blocked by:** [`01`](01-prune-the-orphaned-tracks.md).

**Status:** ready-for-agent

**Labels:** `enhancement`, `ready-for-agent`

- [ ] The run accepts a signal and stops claiming new tracks once it is set, returning the count it completed.
- [ ] A track already being removed when the signal arrives finishes its removal rather than being interrupted.
- [ ] Every track the stopped run did not reach is still present, with its row and its media intact, for the next run.
- [ ] The server's close hook signals a running prune and stops the job's clock.
- [ ] A stopped run can be followed by a later run that removes what it left.
