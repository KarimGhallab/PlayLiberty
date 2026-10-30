# 07: The production instance holds the Pangolin key as a secret

**Status:** ready-for-agent
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** None. Can start immediately.

## What to build

The production pod receives the three Pangolin values and the callback allowlist from configuration. The API key is
a Podman secret with the same handling as the edge assertion; no value is baked into an image or committed in the
manifest. `PANGOLIN_API_URL`, `PANGOLIN_RESOURCE_ID` and `PANGOLIN_INTEGRATION_API_KEY` are set together or not at
all, and `MOBILE_REDIRECT_URIS` carries the callbacks the app may use.

`deploy:build-for-production` creates the secret when it is missing, validates it, refuses a partial set before
touching Podman, and prints the plan under `--dry-run`. The edge README and `.env.example` name the secret and the
callback allowlist.

## Acceptance criteria

- [ ] The manifest references the Pangolin values from a secret, not a literal key.
- [ ] The build script creates the secret when it is missing and validates it.
- [ ] A partial set is refused before any Podman call.
- [ ] `--dry-run` prints the plan without creating anything.
- [ ] The callback allowlist includes the app's HTTPS callback and the reverse-DNS scheme.
- [ ] The README and `.env.example` document the values and the secret name.
- [ ] A boot with a partial set still fails; a boot with none still answers `503`.

## Verification

`pnpm deploy:build-for-production --dry-run` prints the plan without creating a secret. The existing config tests
still prove the all-or-none rule and the `503`. `pnpm run build` and `pnpm run lint:check` pass.
