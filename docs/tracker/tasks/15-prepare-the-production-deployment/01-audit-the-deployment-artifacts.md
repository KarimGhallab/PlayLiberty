# 01: Audit and fix the deployment artifacts

**Status:** resolved

## Outcome

Aligned the production manifest and deployment records. `PUBLIC_ORIGIN` now comes from the mandatory `playliberty_public_origin` secret with key `PUBLIC_ORIGIN`; `ADMIN_PANGOLIN_USER_IDS` comes from the optional `pangolin_admin_user` secret; the edge assertion is unchanged. The retired `PANGOLIN_API_URL`, `PANGOLIN_RESOURCE_ID`, `PANGOLIN_INTEGRATION_API_KEY` and `playliberty-secrets` are gone. The manifest keeps the unique volumes, memory-backed web `/tmp`, no host port, read-only root filesystems, probes and resources; the unit carries the UserNS mapping. The README gains the build command; the architecture record names the script, the three secrets and the UserNS mapping; the deployment guardrail states that the command never installs or starts.

The only remaining `PANGOLIN` match in a deployment path is `ADMIN_PANGOLIN_USER_IDS` in the dev `compose.yaml`, which is the app's admin setting, not a retired Pangolin API value. Docs and manifest only; no test exercises prose.

See [`15-prepare-the-production-deployment`](../../specs/15-prepare-the-production-deployment.md).

See [`15-prepare-the-production-deployment`](../../specs/15-prepare-the-production-deployment.md).
