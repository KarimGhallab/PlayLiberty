# Prepare the production deployment

Status: ready
Labels: `enhancement`

## Problem Statement

The production deployment is a manual sequence of Podman builds, host directory
creation and secret preparation. The order matters, the secret format is not
obvious, and every failed attempt so far has exposed a different gap: a raw
secret where `podman kube play` expects a Kubernetes Secret, an example public
origin that silently breaks mutations, volumes shared with another container, and
an image tag that does not match the manifest.

The repository has the production manifest, the Quadlet unit, both
`Containerfile`s and the deployment documentation, but no repeatable preparation
step. An operator has to infer which images to build, where the data directories
go, which secrets are required, and what shape each secret must take.

The deployment artifacts have also drifted while those failures were fixed. The
public origin is still a plain value, the admin user is not represented at all,
and the documentation does not describe the build step or the secret contracts.
A one-time audit is needed before the build step is written against the manifest.

## Solution

Add `scripts/build-production-deployment.mjs`, invoked by
`pnpm deploy:build-for-production`. It builds the two production images, creates
the host directories, and ensures the three Podman secrets are present and
valid. It does not install the Quadlet units, remove the pod or start the
service; it prints those next steps.

The build step runs on the deployment host from the repository root, uses Node
26 and the host's `podman` and `sudo`, and adds no npm dependency. It is safe to
rerun: valid images are rebuilt, existing valid secrets and directories are kept,
and existing media and database contents are never touched.

A one-time audit task fixes the deployment files and documentation before the
script task starts. The audit is a repository change, not a check the script runs
on every invocation.

## Implementation Decisions

- **The script prepares, it does not deploy.** It builds images, creates the host
  directories and ensures secrets. It does not run `systemctl`, `daemon-reload`,
  `podman pod rm`, `podman pod start` or a health check. _Decided here,_ because
  the operator owns installation and start, and a script that also restarts a
  private service is a deployment tool with a larger failure surface.
- **The images are built directly with `podman build`.** The server image is
  built first and the web image second, sequentially, with fail-fast behaviour.
  Both are tagged `localhost/playliberty-server:latest` and
  `localhost/playliberty-web:latest`; the manifest uses
  `imagePullPolicy: Never`. The dev `compose.yaml` is not used, because it tags
  `:dev`, publishes loopback ports and carries the dev edge assertion.
- **The script resolves the repository root itself.** It works from any current
  directory and never relies on the caller's `cwd`. It checks that both
  `Containerfile`s exist.
- **The build is verified after it runs.** The script checks that both
  `:latest` images exist before it reports success. It does not prune images.
- **The storage contract is `/srv/playliberty`, `media` and `data`, mode
  `0700`.** The directories are created with
  `sudo install -d -m 0700 -o "$USER" -g "$(id -gn)"`, naming the parent
  explicitly so it is not left with the default mode. The script then checks
  that `media` and `data` are writable by the current user. It never recursively
  chowns existing data. If an existing directory is not writable, it fails with
  the exact `chown` command to run. _Decided here,_ because the server runs as
  the mapped host user and the database and media are private.
- **The script does not check `UserNS`.** The production unit already carries
  `UserNS=keep-id:uid=1000,gid=1000`; the audit task verifies it, and the script
  treats it as a prerequisite of the directory step. _Decided here,_ because the
  unit is the owner of that mapping, not the build step.
- **The edge assertion is mandatory.** The secret is
  `playliberty_edge_assertion`, key `EDGE_ASSERTION`. When it is missing, the
  script generates 32 random bytes as hex and stores them base64-encoded in a
  Kubernetes Secret document. It never prints the value. A valid existing secret
  wins. A malformed secret is offered for recreation; declining, or running
  non-interactively without a choice, exits `1`. The edge assertion has no
  replacement flag, because rotating it is not a routine build operation.
- **The public origin is mandatory and is a secret.** The secret is
  `playliberty_public_origin`, key `PUBLIC_ORIGIN`. The value is the full browser
  origin, for example `https://playliberty.example.com`. It must use `https`,
  have no trailing slash, and carry no path, query or fragment. When it is
  missing, the script prompts; when it is valid, it is kept. A malformed value
  is offered for replacement. `--replace-public-origin` updates an existing
  valid secret. _Decided here,_ because the browser `Origin` must match exactly
  or every mutation fails the CSRF origin check.
- **The admin user is optional.** The secret is `pangolin_admin_user`, key
  `ADMIN_PANGOLIN_USER_IDS`, and the manifest references it with
  `optional: true`. The value is a comma-separated list of exact
  `Remote-User` values, trimmed and with empty entries rejected. When the secret
  is missing, the script prompts; an empty answer leaves it absent. A valid
  existing secret wins. `--replace-admin` updates it. _Decided here,_ because the
  app runs without an admin, and an empty secret would look configured.
- **Secrets are JSON Kubernetes Secret documents.** The script reads
  `podman secret inspect --showsecret --format '{{json .}}'`, parses
  `SecretData` as JSON, requires `kind: Secret`, requires the expected data key,
  and base64-decodes the value. A raw value or a YAML document is malformed and
  is offered for recreation. This is the shape `podman kube play` expects for
  `secretKeyRef`.
- **Inputs are flags and environment variables first.** The public origin uses
  `--public-origin` or `PLAYLIBERTY_PUBLIC_ORIGIN`; admin IDs use `--admin-ids`
  or `PLAYLIBERTY_ADMIN_IDS`. The script prompts only when a required value is
  missing and stdin is a terminal. In a non-interactive run it exits `1` and
  names the flag or variable. The edge assertion is never accepted on the
  command line.
- **Dry-run still prompts.** `--dry-run` asks the same questions, validates the
  same existing secrets, and prints the build, directory and secret commands,
  but performs no build, no `mkdir` and no secret creation. Secret values in the
  printed commands are redacted, including a generated edge assertion. It exits
  `1` when a repair is declined or a required value is missing in a
  non-interactive run. _Decided here,_ because the dry-run is a preflight, not a
  second mode with different decisions.
- **The script checks only what it did.** It checks that both images exist, that
  the directories it created are writable, and that the secrets it read or
  created are valid. It does not check `UserNS`, `pangolin_frontend`, installed
  Quadlet units or the running service. Those are the operator's manual steps.
- **The script prints the next steps.** It ends with the exact install,
  `daemon-reload`, stop, pod removal, start and health-check commands. It does
  not execute them. The health check is the web origin's `/healthz` through the
  pod, not a host port.
- **Constants live in the script, and the manifest is the owner.** Secret names,
  keys and storage paths are constants at the top of the script. The audit task
  asserts that the manifest uses the same names and paths, and documents that the
  manifest is the owner. A third config file would add another place to drift.
- **The audit is a one-time blocking task.** It fixes the deployment files and
  documentation before the script task is cut. It is not a runtime preflight.
  Its scope is `deploy/playliberty-web.yaml`, `deploy/playliberty-web.kube`, both
  `Containerfile`s, `compose.yaml`, `README.md`, `docs/ARCHITECTURE.md` and the
  deployment guardrails in `AGENTS.md`.
- **The audit fixes, rather than reports.** It converts the public origin to a
  mandatory secret reference, adds the optional admin secret reference, verifies
  the edge secret, removes every `PANGOLIN_*` value and the
  `playliberty-secrets` reference, keeps the unique volume names and memory
  `/tmp`, verifies no host port, the read-only root filesystems, probes and
  resources, and updates the docs to point at the build command and the secret
  names. It leaves the external deployment guideline alone, because that is
  personal tooling outside this repository.
- **No automated tests are added.** Verification is out of scope for this spec.
  The script's own check is `--dry-run`; the first real deployment remains the
  integration check. _Decided here,_ because the failure surface is Podman and
  the host, not a unit of application logic.

## Tasks

1. **Audit and fix the deployment artifacts.** One-time and blocking. It applies
   the audit findings above, including the public-origin secret, the optional
   admin secret, the manifest reference check, the documentation updates and the
   grep checks for `PANGOLIN_*`, `playliberty-secrets`, `packages/utils` and
   `example.com` in the deployment paths.
2. **Build the production deployment script.** Depends on task 1. It adds
   `scripts/build-production-deployment.mjs` and the
   `deploy:build-for-production` package script, implements the three secret
   contracts, the storage contract, the input model, the dry-run and the printed
   next steps, and adds no tests.

## Out of Scope

- Installing or updating the Quadlet units, running `daemon-reload`, removing a
  pod, starting the service or waiting for health.
- Creating the Pangolin resource, DNS records, TLS certificates or access rules.
- Backups, restores, data migration or secret rotation schedules.
- A CI deployment job or a production release pipeline.
- The mobile client and its provisioning flow.
- Changing the application, its API or its runtime configuration.
- The external deployment guideline in `~/.config/opencode/refs/`.
- Host firewall, SSH, user creation or Podman installation.
- Automated tests or a test harness for the script.
