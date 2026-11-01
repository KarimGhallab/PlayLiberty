# 01: The exchange issues the pair and the app holds one record

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** None. Can start immediately.

## Outcome

The exchange answers a token pair. The access token is a Pangolin resource token minted for the configured access
life, titled `PlayLiberty mobile <family prefix>`. The refresh token is 256 bits of base64url randomness issued by
the server and stored only as a SHA-256 hash.

The three lifetimes are configuration: `MOBILE_ACCESS_TOKEN_LIFETIME_SECONDS` (default 12 hours),
`MOBILE_REFRESH_TOKEN_LIFETIME_SECONDS` (default 180 days) and `MOBILE_FAMILY_LIFETIME_SECONDS` (default one year).
All are positive whole seconds, and a credential that outlives its family fails the boot.

Migration `0008` adds the family, refresh-token and access-token tables. The family keys on the Pangolin user id
rather than an account id: the exchange writes no account, and the glossary's stable account key is the user id.
The access row keeps the Pangolin token id, never its secret.

Issuance mints the access token before it writes anything, then records the family, the first refresh token and the
access token in one transaction, so a Pangolin refusal leaves no half-session. Both clamped lives are `min(lifetime,
family remaining)`. The pair carries the absolute `expires_at` and the relative `expires_in` for each credential, and
the exchange and the later refresh share the one schema.

The app stores one JSON record under one SecureStore key: the access id and secret, the local access deadline, and
the refresh token and expiry. The deadline is the receipt time plus `expires_in`, measured on the device's own clock,
so an offset phone does not read a fresh token as expired. The provisioning callback writes the record; the session
gate, the API client and the API config read it; an absent or malformed record is signed out. `tokenStore` and its
two keys are gone. The web client is untouched.

## Verification

- Server: 474 tests across 34 files. The provisioning suite proves the pair's fields, the configured and default
  lifetimes, the family and access rows, the stored hash against the returned plaintext, the family-prefixed title,
  and that a `502` writes nothing. The credential service proves the family clamp, and the config suite proves the
  defaults and the boot refusal. The migration suite lists the three new tables.
- Mobile: 477 tests across 52 suites. The record suite proves the deadline from the duration, the round trip, the
  access pair, and the signed-out reads for a missing, non-JSON or incomplete record. The provisioning, callback and
  session suites follow the pair.
- `pnpm --filter @playliberty/contracts run build`, `pnpm run build` and `pnpm run lint:check` pass.
- On `emulator-5554`, the provisioning flow signed in from the signed-out door and the account door survived a kill
  and relaunch. The database then held one family for the signed-in account: a 64-character hash, a 180-day refresh
  expiry, a 12-hour access expiry and a one-year family cap.
- The title as Pangolin displays it was not read back; the route test asserts the value handed to the client.

See [`33-refresh-mobile-access`](../../specs/33-refresh-mobile-access.md).
