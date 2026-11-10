# 04: The exchange records its outcome without secrets

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

## Outcome

The exchange now writes one audit line per attempt: action `provisioning_exchange`, outcome allowed or refused, a
reason on every refusal, and the forwarded Pangolin user id when the code resolved. The reasons are
`provisioning_unavailable`, `rate_limited`, `validation_failed`, `code_missing_or_used`, `code_expired`,
`redirect_mismatch`, `verifier_mismatch` and `token_mint_failed`. The existing error line on a Pangolin failure stays.

The audit line and the error line never contain the code, the verifier, the token id or the token secret. The account
is the forwarded Pangolin user id, not a server account id.

**Constraints:** The recording logger is shared test infrastructure. The secret check inspects the exchange's own lines, not the serialized request log.

See [`20-provision-mobile-access`](../../specs/20-provision-mobile-access.md).
