# 45: One owner for the agent exchange and its Check verdict

**Status:** open
**Labels:** `enhancement`, `ready-for-agent`

## Objective

The agent and the server share one description of their socket exchange, so a status, a body field or a decoding rule is written once. The agent returns Check facts and the server decides the verdict.

## Context

Architecture review, 2026-10-27, candidate 2. The recorded decision says the agent is stateless and policy-free and the server owns the policy; this ticket makes the Check obey that line. See [`ARCHITECTURE.md`](../../ARCHITECTURE.md#the-youtube-egress-runs-in-a-host-network-namespace).

## Current state

- The agent writes status codes and body field names; the client decodes them with literals, per route. One status carries three client meanings: a killed listing, a killed download and a refused switch.
- Each end parses bodies and responses privately, so the decoders are exercised only through a real socket.
- The Check verdict is computed by the agent (ok and reason) and recomputed by the server from the same facts.
- The download options are restated in the wire parser, the argv builder and the environment reader, so a new option can be dropped silently by the parser.

## Scope

- One protocol module in the YouTube package: the request and response shapes per route, and one table from status plus body to an outcome. Both ends import it; no status code or field name for the exchange is written outside it.
- The fetch body's options derive from the one shared type.
- The response decoders become pure and unit-tested without a socket.
- The agent answers a Check with facts only; the server derives the verdict and stores it. The row the page reads is unchanged.
- The socket assembly suite keeps proving the wire end to end.

## Out of scope

- The Check download's tuned values, which differ from the server's by design.
- When to rotate, which stays the server's policy.
- New routes and the stream's byte handling.

## Blocking edges

None. Can start immediately.

## Verification

- No status code or body field name for the exchange is written outside the protocol module.
- The decoder tests cover every route outcome, including the three meanings that shared one status.
- A refused listing, an interrupted download and a killed listing still become the same client errors.
- A Check records the same row as before; the agent's answer carries facts only.
- The egress agent, YouTube, server and egress route suites pass; `pnpm run build` and `pnpm run lint:check` pass.

See [ARCHITECTURE.md](../../ARCHITECTURE.md#the-youtube-egress-runs-in-a-host-network-namespace).
