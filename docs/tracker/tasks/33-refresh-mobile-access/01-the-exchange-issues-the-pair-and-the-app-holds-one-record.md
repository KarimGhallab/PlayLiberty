# 01: The exchange issues the pair and the app holds one record

**Status:** ready-for-agent
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** None. Can start immediately.

## Outcome

The exchange answers two credentials. The access token is a Pangolin resource token minted for the configured access
life, and its title carries the short prefix of the family it belongs to. The refresh token is 256 bits of base64url
randomness, issued by the server, stored only as a SHA-256 hash, and it starts one family with its absolute expiry at
the configured family cap.

The three lifetimes are configuration: the access life (default 12 hours), the refresh life (default 180 days) and
the family cap (default one year). All are positive whole seconds, the refresh life may not exceed the cap, and the
access life may not exceed the cap. A new database migration holds a family row, a refresh-token row and an
access-token row. The access row keeps the Pangolin id, the family, the expiry and the revocation time, never the
secret, because sign-out and reuse will need every unexpired token.

The exchange mints the access token before it writes anything, then records the family, the first refresh token and
the access token, and answers one shared token-pair schema. Each credential carries an absolute `expires_at` and a
relative `expires_in`; the access token's life is the earlier of the configured access life and the family's
remaining life.

The app stores one JSON session record: the access id and secret, the local access deadline, the refresh token and
the refresh expiry. The deadline is computed at receipt as the current time plus `expires_in`, not copied from the
server's absolute value, so a phone whose clock is offset does not read a fresh token as expired. The provisioning
callback writes the record, and the session gate and the API config read it. A missing or malformed record is a
signed-out session.

## Acceptance criteria

- [ ] The three lifetimes come from configuration with the defaults above, and an invalid combination fails the boot.
- [ ] The exchange answers the shared pair, and the access token is minted for the configured life, clamped to the
      family's remaining life.
- [ ] Only the refresh token's hash is stored; the plaintext is returned and never written by the server.
- [ ] The access token's title carries the family prefix, and the access row is recorded.
- [ ] The app writes one record atomically, computes its deadline from `expires_in`, and is signed out when the record
      is absent or malformed.
- [ ] The web client and its credential path are untouched.

## Verification

- Server: the exchange suite proves the pair, each configured lifetime, the family clamp, the stored hash, the title
  prefix and the access row, using the fake Pangolin client and the injected clock.
- Mobile: the session and provisioning suites prove the record write, the deadline from the duration, the atomic
  replacement and the signed-out read.
- `pnpm run build` and `pnpm run lint:check` pass.
- On `emulator-5554`, the provisioning journey signs in, a relaunch stays signed in, and a cleared record returns the
  signed-out door.

See [`33-refresh-mobile-access`](../../specs/33-refresh-mobile-access.md).
