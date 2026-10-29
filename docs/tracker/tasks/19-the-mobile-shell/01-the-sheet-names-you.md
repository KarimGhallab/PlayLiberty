# 01: The account sheet names you

**Status:** ready-for-agent
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** None. Can start immediately.

## What to build

The app's server state gets its one owner: a single query client configured with the web's retry rule, where a
4xx is the server's answer and is final, and only a 5xx or an unreached server retries. The account sheet reads the
caller's own account through it and draws the display name, the avatar and the admin mark. The egress door appears
only when the account's role is admin, and it opens the egress route.

A read refused with `401` clears the stored token and shows the signed-out state. No browser opens, and no screen
draws a broken state over a credential it no longer holds. This is the recovery the app already draws, and it is
the only one.

The sheet's copy is added to both catalogues.

## Acceptance criteria

- [ ] Opening the sheet on a signed-in app shows the account's display name and avatar.
- [ ] An account with the `user` role sees no egress door; the `admin` role sees it, and it opens the egress route.
- [ ] A `401` from the account read clears the stored token and leaves the root showing the signed-out state with its
      single action.
- [ ] No screen issues its own request: the account read goes through the one query client.
- [ ] A `400`, a `403` or a `404` is not retried; a `500` retries to the web's limit.
- [ ] The sheet's new copy exists in English and French.

## Verification

`pnpm --filter @playliberty/mobile run test` covers the sheet's items and their gating, and a refused read landing
on the signed-out state. `pnpm run build` and `pnpm run lint:check` pass. On `emulator-5554`: open the sheet signed
in and read the name, then replace the stored token with a refused one and open the sheet again.

See [`19-the-mobile-shell`](../../specs/19-the-mobile-shell.md).
