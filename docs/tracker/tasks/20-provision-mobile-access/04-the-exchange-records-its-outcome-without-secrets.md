# 04: The exchange records its outcome without secrets

**Status:** ready-for-agent
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [`02`](02-the-exchange-counts-the-caller.md)

## What to build

The exchange writes one audit line per attempt. An allowed exchange names the Pangolin user id. A refusal names the
reason and, when the code resolved, the user id. The line never contains the code, the verifier, the token id or the
token secret. The existing error line on a Pangolin failure stays and also carries no secret.

The refusal set is the one the spec names: a missing, used or expired code, a wrong verifier, a redirect mismatch, a
rate-limit refusal and a Pangolin failure. The account is the forwarded Pangolin user id, not a server account id.

## Acceptance criteria

- [ ] A successful exchange writes an allowed line with the Pangolin user id.
- [ ] A wrong verifier, a reused code, an expired code, a redirect mismatch, a rate-limit refusal and a Pangolin
      failure each write a refused line with a reason.
- [ ] No log line contains the code, the verifier, the token id or the token secret.
- [ ] The account field is the forwarded Pangolin user id, not a server account id.
- [ ] The existing error line on a Pangolin failure still records the failure.

## Verification

`pnpm --filter @playliberty/server run test`. The tests capture the logger, assert the audit fields for an allowed
and a refused exchange, and assert that the secrets are absent from every line.
