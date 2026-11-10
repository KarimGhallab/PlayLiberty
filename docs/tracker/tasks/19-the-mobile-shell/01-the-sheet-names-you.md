# 01: The account sheet names you

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

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

**Constraints:** A refused-token device pass needs the public origin, where the edge validates the token; the dev proxy never answers `401`.

See [`19-the-mobile-shell`](../../specs/19-the-mobile-shell.md).
