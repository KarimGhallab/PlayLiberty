# 01: The provisioning paths write no account

**Status:** ready-for-agent
**Labels:** `bug`, `ready-for-agent`
**Source:** [`20-provision-mobile-access`](../../specs/20-provision-mobile-access.md), "GET /provision is behind SSO
and answers a redirect to the app", and user story 20.
**Blocked by:** None. Can start immediately.

## Observed

The identity hook resolves an account on every authenticated request. That resolution inserts a row for a first-time
Pangolin user and refreshes an existing row's display name, email, role and `updatedAt`. A `GET /provision` therefore
writes to the account table before it mints a code, and an abandoned or refused provisioning leaves that write
behind.

## Expected

The provisioning paths prove the edge assertion and read the forwarded identity, but create or refresh no account.
`GET /provision` mints the code for the forwarded Pangolin user id, and `POST /auth/exchange` mints the token for the
id the code carries. A half-finished flow changes nothing. Every other route still resolves and refreshes the
account as it does today.

## Evidence

A probe on a fresh test database counted zero accounts before one `/provision` for a new Pangolin user and one after.
The provisioning route reads the resolved account's Pangolin id, so the row is not incidental to the code; it is the
route's source of identity.

## Acceptance criteria

- [ ] A new Pangolin user's `/provision` mints a code and leaves the account table empty.
- [ ] An existing user's `/provision` leaves the row's display name, email, role and `updatedAt` unchanged.
- [ ] A refused `/provision` (an unlisted redirect, an unavailable issuer) leaves the account table empty.
- [ ] The exchange mints the token for the code's Pangolin user id with no account row.
- [ ] Every other route still resolves and refreshes the account as it does today.

## Verification

`pnpm --filter @playliberty/server run test`. The new tests count the account table and compare the row before and
after; the existing provisioning and account tests stay green.
