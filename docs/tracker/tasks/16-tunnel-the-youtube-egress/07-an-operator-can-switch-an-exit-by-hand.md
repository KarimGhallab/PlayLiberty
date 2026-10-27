# 07: An operator can switch an exit by hand

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

## Outcome

`POST /egress/:name/switch` was the admin override. It called the agent's switch
with `EGRESS_DRAIN_TIMEOUT_MS`, applied the returned status and answered the whole
pool. Switching to a config marked `failed` returned it to `unknown`, cleared its
counter and dropped its last error: the operator's choice is newer than the
stored verdict. A config that was already `ok` kept that state. A refused switch
wrote nothing, an unknown name was the same 404 a non-admin gets, and an
unreachable agent answered `agentReachable: false` with the unchanged pool. The
active row was never moved optimistically.

Superseded by [10](10-one-action-per-egress-row.md), which reduced the page to
one action per row and left the unverified apply to rotation.

See [`16-tunnel-the-youtube-egress`](../../specs/16-tunnel-the-youtube-egress.md).
