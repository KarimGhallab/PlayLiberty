# 03: An admin can probe an exit

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

## Outcome

The pool page became evidence: the agent answered `POST /probe` with the latest
handshake, one listing extraction and the exit's own address, and the server
stored the verdict, the reason, the exit address and the probe time. The listing
and the address decided the verdict; the handshake was evidence. A named probe
switched to that config first, through the same pool-membership check the manual
switch uses. A failure was classified by `classifyEgressFailure` into `blocked`,
`unavailable`, `network` or `unknown`; yt-dlp's stderr never reached the row.

Only the verdict, the reason, the address and the time are stored. The handshake
is measured and reported but has no column, so keeping it would be one migration.

Superseded by [10](10-one-action-per-egress-row.md), which turned the probe into
the `switch` and `check` actions.

See [`16-tunnel-the-youtube-egress`](../../specs/16-tunnel-the-youtube-egress.md).
