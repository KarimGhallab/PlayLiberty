# 08: The record follows the refresh model

**Status:** ready-for-agent
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [`07`](07-expired-credentials-are-pruned-and-the-key-can-delete.md)

## Outcome

The earlier records stop describing one 180-day token. In spec `20`, the lifetime sentence, the exchange decision
that mints a 180-day token, and the out-of-scope clauses that exclude refresh and revocation follow the pair and its
family. Its claim that the life is a configuration change becomes true and points at the three lifetime values. Spec
`19`'s sentence that the app has no revocation path is corrected: sign-out now revokes the family.

`ARCHITECTURE.md`'s mobile provisioning section and mobile stack paragraph describe the pair, the silent renewal, the
refresh family and the second exact SSO exemption. The spec tracker's row for `33` is marked resolved and links this
ticket set. Every other provisioning decision stands.

## Acceptance criteria

- [ ] Spec `20` no longer claims a 180-day token, and its refresh and revocation out-of-scope clauses are gone.
- [ ] Spec `19` no longer says the app has no revocation path.
- [ ] `ARCHITECTURE.md` describes the pair, the renewal, the family and both exact exemptions.
- [ ] The spec tracker records `33` as resolved with its ticket set.

## Verification

- A search for the old lifetime and revocation claims across `docs/` finds no stale statement outside the superseded
  record of this spec.
- Every link added resolves.
- No em dash is introduced.

See [`33-refresh-mobile-access`](../../specs/33-refresh-mobile-access.md).
