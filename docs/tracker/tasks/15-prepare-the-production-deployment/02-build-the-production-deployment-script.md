# 02: Build the production deployment script

**Status:** ready-for-agent
**Blocked by:** [01](01-audit-the-deployment-artifacts.md).

## What to build

Add `scripts/build-production-deployment.mjs` and expose it as
`pnpm deploy:build-for-production`. The command builds both production images, creates
the host data directories, ensures the three Podman secrets, and prints the manual
install and start steps. It does not install, remove or start anything.

The command runs on the deployment host from the repository, uses Node 26 without an
npm dependency, and is safe to rerun. It prompts only when a required value is missing
and the session is interactive.

## Acceptance criteria

- [ ] `pnpm deploy:build-for-production` runs the new script from any working directory.
- [ ] A real run builds `localhost/playliberty-server:latest` then `localhost/playliberty-web:latest` with direct `podman build`, fails fast, and checks that both images exist.
- [ ] The script creates `/srv/playliberty`, `media` and `data` at mode `0700`, owned by the current user and group, with `sudo install -d`; it checks that `media` and `data` are writable, never recursively chowns, and never touches existing media or database contents.
- [ ] `playliberty_edge_assertion` with key `EDGE_ASSERTION` is mandatory. A missing secret is generated from 32 random bytes as hex and stored as a JSON Kubernetes Secret; the value is never printed. A valid existing secret wins; a malformed one is offered for recreation and fails when the offer is declined or the session is non-interactive.
- [ ] `playliberty_public_origin` with key `PUBLIC_ORIGIN` is mandatory. The value is a full `https` origin with no trailing slash, path, query or fragment. It comes from `--public-origin` or `PLAYLIBERTY_PUBLIC_ORIGIN`, is prompted when missing, and is kept when a valid secret already exists. `--replace-public-origin` updates it.
- [ ] `pangolin_admin_user` with key `ADMIN_PANGOLIN_USER_IDS` is optional. Its value is a comma-separated list of exact `Remote-User` values, trimmed and without empty entries. It comes from `--admin-ids` or `PLAYLIBERTY_ADMIN_IDS`, is prompted when missing, and an empty answer leaves it absent. `--replace-admin` updates it.
- [ ] Every secret is validated as a JSON `v1.Secret` with the expected data key and a non-empty base64 value. A raw value or YAML document is malformed.
- [ ] `--dry-run` asks the same questions, performs no build, directory creation or secret creation, redacts secret values in printed commands, and exits non-zero when a required value is missing or a repair is declined.
- [ ] The script checks only what it did: both images exist, the directories are writable, and the secrets it read or created are valid. It does not check `UserNS`, `pangolin_frontend`, installed units or the running service.
- [ ] The script prints the exact install, `daemon-reload`, stop, pod removal, start and `/healthz` commands without executing them.
- [ ] No automated tests are added, and no application behavior changes.

See [`15-prepare-the-production-deployment`](../../specs/15-prepare-the-production-deployment.md).
