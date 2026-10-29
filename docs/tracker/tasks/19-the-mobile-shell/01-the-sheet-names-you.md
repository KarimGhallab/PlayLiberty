# 01: The account sheet names you

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** None. Can start immediately.

## Outcome

The app now has one server-state owner. `createAppQueryClient` builds the client with the web's retry rule, where a
4xx is final and only a 5xx or an unreached server retries, and its query cache reports a `NeedsProvisioningError`
once, without retrying. `AppProviders` wires that report to the session store's `expire`.

The session moved into a store, because a `401` has to reach the root without a focus change. `refresh` re-reads the
token behind a generation guard, so a read started before a sign-out cannot resurrect the session, and `expire`
clears the token and marks the app signed out. `useSession` keeps its shape and still re-reads on focus, so the
callback's write is seen on the way back.

The account read goes through the one client on the web's `['me']` key. The sheet draws the display name, the avatar
when the account has one, and the admin mark, and it offers the egress door only to an admin role; the door is a
callback the root answers with `/egress`, which keeps the sheet free of routing. A failed read draws the problem's
title under the identity. The new copy is `account.admin` and `account.egress` in both catalogues.

## Verification

- Mobile 36 tests across 8 suites: the retry rule, the refusal reported once, `expire` clearing the token, and the
  sheet's name, avatar, admin mark, door gating, sign-out and refusal line.
- i18n 37, web 648, all green.
- `pnpm run build` and `pnpm run lint:check` pass.
- On `emulator-5554` the sheet reads `Milloser` for the `user` account, with no admin mark and no egress door, and
  the read came from the running server through the dev proxy.

## Notes

- The ticket's second device step, replacing the stored token with a refused one, cannot be exercised in the dev
  topology: Vite injects a valid identity, so the server never answers `401` to the app. The raw server does answer
  `401` to a direct caller, verified, and the refusal chain is covered at both of its seams. The device pass for a
  refused token belongs with a run against the public origin, where the edge validates the token.
- The account has no avatar URL, so the device drew no image. Both branches are covered by the sheet test.

See [`19-the-mobile-shell`](../../specs/19-the-mobile-shell.md).
