# 44: One meaning for a failed source read

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

## Outcome

`packages/youtube/src/errors/errors.ts` is the one vocabulary. `SourceFailureKind` names five kinds (`unavailable`, `private`, `blocked`, `network`, `unknown`); `classifySourceFailure` reads yt-dlp's phrases into one; `failureMeaning` maps a kind to one `FailureDisposition` (`terminal`, `retry`, `interrupted`, `exitFault`) and one fixed sentence; `failureOf` reads the meaning off any error. A private video is now its own kind rather than folded into `unavailable`.

Every error type that carries a failure extends `SourceFailureError` and carries its `failure`: the gone video is terminal, SponsorBlock is retry, the stream, switch and switch-failure errors are interrupted, the circuit is an interrupted block, and `EgressSourceUnavailableError` derives its disposition from the kind. An untyped error reads its kind from its message and stays retryable. `classifyEgressFailure` and `isExitLevelFailure` are gone. The client's sentence table moved into the vocabulary, and `EgressSourceUnavailableError` moved with it.

The download worker switches once on `failure.disposition`: terminal marks the source removed, interrupted and exit-fault release the claim, and retry writes the failed row with the kind and the bounded raw reason. The policy asks the disposition rather than enumerating reasons, and the Sync reads the circuit's sentence from the vocabulary. The egress service's outcomes stay: they name the agent exchange, which ticket 45 owns.

A Track now stores `failure_kind` beside `failure_reason` (migration `0007_nervous_blade.sql`), the contract carries `failureKind`, and the failed row's sentence comes from that kind through the existing i18n keys. The browser's regex classifier is deleted; `TrackRow` renders `failureSentence(t, failureKind)` and keeps the raw reason behind the disclosure. A row written before this change has no kind and falls back to the unknown sentence until its next retry.

The kind is declared in both the YouTube package and the contract because the adapter has no dependency on `@playliberty/contracts`; `storedFailureKind` in `trackLifecycle.ts` is the compile-checked projection between them.

See [ARCHITECTURE.md](../../ARCHITECTURE.md#the-youtube-egress-runs-in-a-host-network-namespace).
