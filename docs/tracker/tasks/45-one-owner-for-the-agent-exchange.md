# 45: One owner for the agent exchange and its Check verdict

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

## Outcome

`packages/youtube/src/egressAgent/protocol.ts` is the one description of the socket. It owns the routes and methods, the `x-source-extension` header, the HTTP statuses, the error codes, and one `ERROR_STATUSES` table from a code to its status. `wireReply` turns an outcome into the status and body the agent writes; `decodeReply` maps a status and body back to an outcome and refuses a pair the table does not allow. The request builders and parsers, the response parsers and the download-option validator live there too.

Both ends import it. The agent's routes return an `AgentReply` and one `sendReply` writes it through `wireReply`; no status code or body field is written by hand. The client asks for each route through the protocol, decodes every answer through `decodeReply`, and throws the error that route names. The three meanings that shared one status now survive as two error codes: a killed listing and a killed download both answer `switching` and become `EgressSwitchError` and `EgressStreamError` at their own route, while a refused switch answers `switch_failed` and becomes `EgressSwitchFailedError`.

The fetch body's options validate against a table declared `satisfies Record<keyof DownloadOptions, ...>`, so a new option fails the wire parser at compile time. The server's config now carries `DownloadOptions` instead of a second copy of the shape.

The Check is facts only. `EgressCheckFacts.reason` became `failure`, which is what the listing said, not a verdict. `checkActive` no longer computes `ok` or substitutes `network`; `egressService.applyCheckFacts` derives `ok` from the listing and the exit address and stores `failure ?? network`. The row the page reads is unchanged.

The decoders are pure and unit-tested against every code and every malformed body. The socket assembly suite still proves the wire end to end.

## Verification

- The protocol's table test round-trips every error outcome, keeps the two 503 meanings and the two 502 meanings apart, and refuses a status that disagrees with its body.
- The request and response parsers cover a valid body, a missing download option, an empty limit rate, a bad video id and a bad source entry.
- A killed listing, a killed download and a refused switch still become their own client errors over a real socket.
- A Check with a working listing and no exit address records the network failure; the agent's answer carries facts only.
- `pnpm run test:unit` is 1200 passed across all packages and apps; `pnpm run build` and `pnpm run lint:check` pass.

See [ARCHITECTURE.md](../../ARCHITECTURE.md#the-youtube-egress-runs-in-a-host-network-namespace).
