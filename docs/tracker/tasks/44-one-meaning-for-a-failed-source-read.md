# 44: One meaning for a failed source read

**Status:** open
**Labels:** `enhancement`, `ready-for-agent`

## Objective

A source read that fails has one meaning in the product: one module classifies it, names its disposition (terminal, retry on the next pass, interrupted, or the Exit's fault), and holds its fixed sentence. A Track row stores that kind beside the raw message, so the row's sentence and the server's decision cannot disagree.

## Context

Architecture review, 2026-10-27, candidate 1. Vocabulary: [`GLOSSARY.md`](../../GLOSSARY.md) (Download, Egress, Unavailable, Remote-removed). The egress decision in [`ARCHITECTURE.md`](../../ARCHITECTURE.md#the-youtube-egress-runs-in-a-host-network-namespace) fixes who counts a failure; this ticket fixes who names it.

## Current state

- The YouTube package classifies a message (unavailable, blocked, network, unknown), decides whether a reason is the Exit's, and holds the fixed sentences.
- Four server modules re-decide what a failure means: the download worker (terminal, release the claim, or fail the row), the egress policy (is this the Exit's fault), the Sync (blocked or failed), and the egress service (unknown config, refused switch, unreachable agent).
- The Track row stores the raw tool message. The browser classifies that text again with its own five classes, so the row's sentence is a second opinion.
- The agent client maps a reason to a fixed sentence in a table of its own.

## Scope

- One vocabulary in the YouTube package: classify a message, name the disposition, give the fixed sentence. The existing error types and the agent carry the disposition; no caller re-derives it from an error class.
- The four server sites switch once on the disposition. Adding a failure type edits the vocabulary, not four sites.
- A Track stores the failure kind beside the raw reason: schema, contract, server write. The row's sentence comes from the kind through the existing i18n keys; the raw text stays behind the disclosure.
- The browser's classifier is deleted, and the client's sentence table moves into the vocabulary.
- Tests: the vocabulary's table (owner), the worker's three dispositions, the policy's Exit-level rule, the Sync's blocked sentence, and the row's sentence from a stored kind.

## Out of scope

- The retry policy and the rotation limit.
- The Sync run's stored error text.
- The Check verdict; ticket 45 owns it.
- French wording.

## Blocking edges

None. Can start immediately.

## Verification

- A blocked read, an Unavailable video, a SponsorBlock outage, an interrupted download and an open circuit each still reach the same user-visible end state.
- A failed row shows the mapped sentence from its stored kind and still discloses the raw text.
- A new failure type needs no edit outside the vocabulary; the compiler finds the one switch.
- `pnpm --filter @playliberty/youtube test`, `pnpm --filter @playliberty/server test` and `pnpm --filter @playliberty/web test` pass; `pnpm run build` and `pnpm run lint:check` pass.

See [ARCHITECTURE.md](../../ARCHITECTURE.md#the-youtube-egress-runs-in-a-host-network-namespace).
