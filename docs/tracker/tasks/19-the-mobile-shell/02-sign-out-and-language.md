# 02: Sign out hands the phone over, in your language

**Status:** ready-for-agent
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [`01`](01-the-sheet-names-you.md)

## What to build

Sign out forgets the token on the device, clears the whole query cache so no collaborator's data survives the
handover, keeps the language, and returns to the signed-out state. It calls no server route, because the app has no
revocation path: the token stays valid on the instance until it expires. That consequence is recorded, not solved.

The language control in the sheet switches the running app and the choice survives a restart. The shared provider's
seam is tested in `packages/i18n` at its own seam: the injected write is called with the new language, the storage
port is written, and the resolution order is unchanged. The web's provider tests must pass untouched, which is the
proof the seam did not move the web's behaviour.

## Acceptance criteria

- [ ] After Sign out, the root draws the signed-out state and no account, playlist or track read is still cached.
- [ ] The language chosen before signing out is still in force after signing out and after a relaunch.
- [ ] The language control updates the sheet and the rest of the app without a relaunch.
- [ ] `packages/i18n` tests the injected write and the storage port, and the web's suite passes unchanged.
- [ ] Sign out issues no request.

## Verification

The mobile, i18n and web suites pass, with `pnpm run build` and `pnpm run lint:check`. On `emulator-5554`: switch to
French, sign out, kill the app, relaunch, and read a French signed-out state.

See [`19-the-mobile-shell`](../../specs/19-the-mobile-shell.md).
