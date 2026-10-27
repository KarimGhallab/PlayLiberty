# 06: Five failures rotate the exit, and an exhausted pool blocks the sync

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

## Outcome

The policy sits around the source calls in `EgressPolicyClient`, composed in
`buildApp` only for `YOUTUBE_TRANSPORT=egress-agent`. An exit-level failure is
counted on the active config, the limit switches to the next non-failed config in
round robin, and the operation retries once. A success writes `ok`, clears the
counter and stamps the attempt.

The classifier is `classifyEgressFailure` plus `isExitLevelFailure`. A 404 is now
a gone video, never an exit failure. The circuit is derived from the rows, never
stored: every config failed means the sync ends `blocked` with the fixed sentence
`The source is unreachable from every exit.` and the tracks stay pending. A
download does not ask a failed pool again; a listing still tries, so the next
sync can notice an exit that came back.

The switch lives in the agent. `POST /switch` drains the registered yt-dlp
children for `EGRESS_DRAIN_TIMEOUT_MS`, kills the process groups that outlive the
drain, then runs `wg-quick strip` and `wg syncconf` inside the namespace. A route
that fails while the switch is in flight answers `switching`, which the server
maps to an interrupted download: the claim returns to `pending`. The agent
refuses a switch with no interface before draining, so a development host never
kills work it cannot replace.

See [`16-tunnel-the-youtube-egress`](../../specs/16-tunnel-the-youtube-egress.md).
