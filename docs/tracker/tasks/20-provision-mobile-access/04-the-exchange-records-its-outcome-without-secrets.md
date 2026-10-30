# 04: The exchange records its outcome without secrets

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [`02`](02-the-exchange-counts-the-caller.md)

## Outcome

The exchange now writes one audit line per attempt: action `provisioning_exchange`, outcome allowed or refused, a
reason on every refusal, and the forwarded Pangolin user id when the code resolved. The reasons are
`provisioning_unavailable`, `rate_limited`, `validation_failed`, `code_missing_or_used`, `code_expired`,
`redirect_mismatch`, `verifier_mismatch` and `token_mint_failed`. The existing error line on a Pangolin failure stays.

The audit line and the error line never contain the code, the verifier, the token id or the token secret. The account
is the forwarded Pangolin user id, not a server account id.

## Verification

- Server 470 tests across 33 suites, `tsc -p tsconfig.json --noEmit`, `pnpm run build` and `pnpm run lint:check`
  pass.
- Seven audit tests cover the allowed exchange and each named refusal, and assert that the exchange's lines carry
  none of the four secrets.

## Notes

- The recording logger moved to the shared test infrastructure so the audit and provisioning tests use one copy.
- The secret check inspects the exchange's own lines. The recording logger keeps Fastify's raw request objects,
  which are not the serialized request log the server writes.

See [`20-provision-mobile-access`](../../specs/20-provision-mobile-access.md).
