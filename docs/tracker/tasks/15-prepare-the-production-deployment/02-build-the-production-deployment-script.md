# 02: Build the production deployment script

**Status:** resolved
**Blocked by:** [01](01-audit-the-deployment-artifacts.md).

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
creating secrets, and prints the manual install and start steps. Both
`localhost/playliberty-server:latest` and `localhost/playliberty-web:latest`
were built directly and pass the image checks. `node --check`, `--help`, the
dry run from the repository and from another directory, `pnpm run build` and
`pnpm run lint` pass. Directory and secret creation were not executed on this
workstation; the first deployment-host run remains the integration check.

See [`15-prepare-the-production-deployment`](../../specs/15-prepare-the-production-deployment.md).

## What to build

Add `scripts/build-production-deployment.mjs` and expose it as
`pnpm deploy:build-for-production`. The command builds both production images, creates
the host data directories, ensures the three Podman secrets, and prints the manual
install and start steps. It does not install, remove or start anything.

The command runs on the deployment host from the repository, uses Node 26 without an
npm dependency, and is safe to rerun. It prompts only when a required value is missing
and the session is interactive.

## Acceptance criteria

- [x] `pnpm deploy:build-for-production` runs the new script from any working directory.
- [x] A real run builds `localhost/playliberty-server:latest` then `localhost/playliberty-web:latest` with direct `podman build`, fails fast, and checks that both images exist.
- [x] The script creates `/srv/playliberty`, `media` and `data` at mode `0700`, owned by the current user and group, with `sudo install -d`; it checks that `media` and `data` are writable, never recursively chowns, and never touches existing media or database contents.
- [x] `playliberty_edge_assertion` with key `EDGE_ASSERTION` is mandatory. A missing secret is generated from 32 random bytes as hex and stored as a JSON Kubernetes Secret; the value is never printed. A valid existing secret wins; a malformed one is offered for recreation and fails when the offer is declined or the session is non-interactive.
- [x] `playliberty_public_origin` with key `PUBLIC_ORIGIN` is mandatory. The value is a full `https` origin with no trailing slash, path, query or fragment. It comes from `--public-origin` or `PLAYLIBERTY_PUBLIC_ORIGIN`, is prompted when missing, and is kept when a valid secret already exists. `--replace-public-origin` updates it.
- [x] `pangolin_admin_user` with key `ADMIN_PANGOLIN_USER_IDS` is optional. Its value is a comma-separated list of exact `Remote-User` values, trimmed and without empty entries. It comes from `--admin-ids` or `PLAYLIBERTY_ADMIN_IDS`, is prompted when missing, and an empty answer leaves it absent. `--replace-admin` updates it.
- [x] Every secret is validated as a JSON `v1.Secret` with the expected data key and a non-empty base64 value. A raw value or YAML document is malformed.
- [x] `--dry-run` asks the same questions, performs no build, directory creation or secret creation, redacts secret values in printed commands, and exits non-zero when a required value is missing or a repair is declined.
- [x] The script checks only what it did: both images exist, the directories are writable, and the secrets it read or created are valid. It does not check `UserNS`, `pangolin_frontend`, installed units or the running service.
- [x] The script prints the exact install, `daemon-reload`, stop, pod removal, start and `/healthz` commands without executing them.
- [x] No automated tests are added, and no application behavior changes.

See [`15-prepare-the-production-deployment`](../../specs/15-prepare-the-production-deployment.md).
