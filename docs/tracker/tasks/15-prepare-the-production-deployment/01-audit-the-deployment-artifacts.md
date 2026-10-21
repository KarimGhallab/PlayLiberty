# 01: Audit and fix the deployment artifacts

**Status:** resolved
**Blocked by:** None. Can start immediately.

## Outcome

Aligned the production manifest and deployment records. `PUBLIC_ORIGIN` now comes from the mandatory `playliberty_public_origin` secret with key `PUBLIC_ORIGIN`; `ADMIN_PANGOLIN_USER_IDS` comes from the optional `pangolin_admin_user` secret; the edge assertion is unchanged. The retired `PANGOLIN_API_URL`, `PANGOLIN_RESOURCE_ID`, `PANGOLIN_INTEGRATION_API_KEY` and `playliberty-secrets` are gone. The manifest keeps the unique volumes, memory-backed web `/tmp`, no host port, read-only root filesystems, probes and resources; the unit carries the UserNS mapping. The README gains the build command; the architecture record names the script, the three secrets and the UserNS mapping; the deployment guardrail states that the command never installs or starts.

The only remaining `PANGOLIN` match in a deployment path is `ADMIN_PANGOLIN_USER_IDS` in the dev `compose.yaml`, which is the app's admin setting, not a retired Pangolin API value. Docs and manifest only; no test exercises prose. `pnpm run build` and `pnpm run lint` pass.

See [`15-prepare-the-production-deployment`](../../specs/15-prepare-the-production-deployment.md).

## What to build

One pass over the repository's production deployment artifacts and documentation, fixing
the drift the failed deployments exposed. The end state is a production shape the build
script can target: one public origin secret, an optional admin secret, a mandatory edge
secret, no retired Pangolin values, isolated volumes, no host port, and one documented
build command.

The audit covers the production pod manifest, the Quadlet unit, both `Containerfile`s,
the dev `compose.yaml`, the README, the architecture record and the deployment guardrails.

## Acceptance criteria

- [x] The production manifest references `playliberty_public_origin` with key `PUBLIC_ORIGIN` as a mandatory secret, and `pangolin_admin_user` with key `ADMIN_PANGOLIN_USER_IDS` as an optional secret.
- [x] The manifest keeps the edge assertion reference and removes every `PANGOLIN_*` value and the `playliberty-secrets` reference.
- [x] The manifest keeps the unique volume names, the memory-backed web `/tmp`, no host port, the read-only root filesystems, the probes and the resource limits.
- [x] The Quadlet unit carries `Yaml=playliberty-web.yaml`, `Network=pangolin_frontend.network` and `UserNS=keep-id:uid=1000,gid=1000`.
- [x] Both `Containerfile`s still build the production images, run non-root with a read-only root, and do not reference the removed `packages/utils`.
- [x] `compose.yaml` remains the dev stack: loopback ports, `dev-edge` and no `pangolin_frontend` network.
- [x] The README names `pnpm deploy:build-for-production`; the architecture record names the script, the three secret names and the UserNS mapping; the deployment guardrails still match the build-only boundary.
- [x] No deployment path contains `PANGOLIN_*`, `playliberty-secrets`, `packages/utils` or `example.com`.
- [x] `pnpm run build` and `pnpm run lint` pass.

See [`15-prepare-the-production-deployment`](../../specs/15-prepare-the-production-deployment.md).
