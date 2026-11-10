# 02: Build the production deployment script

**Status:** resolved

## Outcome

Added `scripts/build-production-deployment.mjs` and the
`pnpm deploy:build-for-production` package script. The command builds both
`:latest` images with direct `podman build`, prepares `/srv/playliberty` with
`sudo install -d -m 0700`, and ensures the edge, public-origin and optional admin
secrets as JSON `v1.Secret` documents. Existing valid secrets win;
`--replace-public-origin` and `--replace-admin` update them. Malformed secrets
are offered for repair, and a declined repair or missing required value exits
non-zero.

`--dry-run` prompts and validates without building, creating directories or
creating secrets, and prints the manual install and start steps. Directory and secret creation were not executed on this
workstation; the first deployment-host run remains the integration check.

See [`15-prepare-the-production-deployment`](../../specs/15-prepare-the-production-deployment.md).

See [`15-prepare-the-production-deployment`](../../specs/15-prepare-the-production-deployment.md).
