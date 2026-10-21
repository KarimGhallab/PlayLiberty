# 01: Audit and fix the deployment artifacts

**Status:** ready-for-agent
**Blocked by:** None. Can start immediately.

## What to build

One pass over the repository's production deployment artifacts and documentation, fixing
the drift the failed deployments exposed. The end state is a production shape the build
script can target: one public origin secret, an optional admin secret, a mandatory edge
secret, no retired Pangolin values, isolated volumes, no host port, and one documented
build command.

The audit covers the production pod manifest, the Quadlet unit, both `Containerfile`s,
the dev `compose.yaml`, the README, the architecture record and the deployment guardrails.

## Acceptance criteria

- [ ] The production manifest references `playliberty_public_origin` with key `PUBLIC_ORIGIN` as a mandatory secret, and `pangolin_admin_user` with key `ADMIN_PANGOLIN_USER_IDS` as an optional secret.
- [ ] The manifest keeps the edge assertion reference and removes every `PANGOLIN_*` value and the `playliberty-secrets` reference.
- [ ] The manifest keeps the unique volume names, the memory-backed web `/tmp`, no host port, the read-only root filesystems, the probes and the resource limits.
- [ ] The Quadlet unit carries `Yaml=playliberty-web.yaml`, `Network=pangolin_frontend.network` and `UserNS=keep-id:uid=1000,gid=1000`.
- [ ] Both `Containerfile`s still build the production images, run non-root with a read-only root, and do not reference the removed `packages/utils`.
- [ ] `compose.yaml` remains the dev stack: loopback ports, `dev-edge` and no `pangolin_frontend` network.
- [ ] The README names `pnpm deploy:build-for-production`; the architecture record names the script, the three secret names and the UserNS mapping; the deployment guardrails still match the build-only boundary.
- [ ] No deployment path contains `PANGOLIN_*`, `playliberty-secrets`, `packages/utils` or `example.com`.
- [ ] `pnpm run build` and `pnpm run lint` pass.

See [`15-prepare-the-production-deployment`](../../specs/15-prepare-the-production-deployment.md).
