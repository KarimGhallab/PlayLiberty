# Scaffold the server skeleton

Status: resolved
Labels: `enhancement`

## Outcome

`packages/contracts` holds the Zod schemas, `packages/youtube` the URL validator, argument builders, spawn wrapper and faststart remux, and `apps/server` the Fastify app: Zod config, the Drizzle schema with seven tables and a committed migration, the forwarded-header auth hook with fail-closed provisioning, the CSRF guard, health and readiness, the `/api/v1` surface with `501` placeholders plus the real stream and thumbnail routes, the no-op download worker, the prune scheduler and the startup sweep, and the Containerfile, dev compose and production Quadlet unit. See [`The server stack`](../../ARCHITECTURE.md#the-server-stack), [`The server's folder boundaries`](../../ARCHITECTURE.md#the-servers-folder-boundaries) and [`ARCHITECTURE.md`](../../ARCHITECTURE.md).

## Verification

Build, lint, format, test, depcruise, syncpack and the tsconfig path check pass; the container serves `/healthz` and `/readyz` and publishes no host port.
