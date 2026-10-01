# Define the server stack

Status: resolved
Labels: `enhancement`

## Outcome

The stack is recorded in ADR 0004: Node 26 with Fastify 5, `tsc` output, `better-sqlite3` plus Drizzle on local SQLite, the Zod `/api/v1` surface, `packages/youtube` as the only yt-dlp seam, an in-process worker and a `croner` prune with the track rows as the queue, and an authorized streaming route. The schema, API surface, sync pipeline and deployment shape are in the ADR and in the architecture doc. The skeleton and its checks landed in [`04-scaffold-server`](04-scaffold-server.md).

## Verification

An ADR records the stack and the rejected alternatives; the skeleton passes build, lint, depcruise and syncpack, and no container publishes a host port.
