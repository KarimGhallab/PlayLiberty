# 07: The production instance holds the Pangolin key as a secret

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** None. Can start immediately.

## Outcome

The production manifest now reads `PANGOLIN_API_URL`, `PANGOLIN_RESOURCE_ID`, `PANGOLIN_INTEGRATION_API_KEY` and
`MOBILE_REDIRECT_URIS` from one Podman secret, `playliberty_pangolin`. The four references are optional, so a host
without the secret still boots and answers `503`; a secret with only some keys leaves the rest unset and the boot
fails on the all-or-none rule.

`deploy:build-for-production` creates and validates the four-key secret. It refuses a partial set of the three
`PANGOLIN_*` inputs before any Podman call, accepts the API URL and resource id from flags or environment, reads the
integration key from `PLAYLIBERTY_PANGOLIN_INTEGRATION_API_KEY` or prompts for it, and replaces an existing secret
with `--replace-pangolin`. The callback allowlist defaults to the public origin's `/auth/callback` plus
`dev.playliberty.app://provision`; an override must include both. `--dry-run` prints the plan and creates nothing.

The edge README and `.env.example` name the secret, the four values and the callback allowlist.

## Verification

- `pnpm deploy:build-for-production --dry-run --public-origin https://playliberty.example.com --pangolin-api-url
https://api.example.com/v1 --pangolin-resource-id 5` printed the Pangolin block and completed; `podman secret ls`
  stayed empty.
- The config and provisioning tests pass, 40 tests across two files: the all-or-none rule, the `503` with no
  integration API, and the `503` with no callback.
- `node --check`, `pnpm run build` and `pnpm run lint:check` pass.

## Notes

- The integration key is never printed by the plan and never accepted on the command line; the prompt is the
  interactive path, the environment variable the non-interactive one.
- The secret references are optional to preserve the documented "none means 503" behaviour; a prepared production
  host still gets the secret from the build script.

See [`20-provision-mobile-access`](../../specs/20-provision-mobile-access.md).
