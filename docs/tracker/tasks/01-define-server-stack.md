# Define the server stack

**Status:** resolved
**Labels:** `enhancement`

## Outcome

The stack is recorded in [`The server stack`](../../ARCHITECTURE.md#the-server-stack): Node 26 with Fastify 5, `tsc` output, `better-sqlite3` plus Drizzle on local SQLite, the Zod `/api/v1` surface, `packages/youtube` as the only yt-dlp seam, an in-process worker and a `croner` prune with the track rows as the queue, and an authorized streaming route. The schema, API surface, sync pipeline and deployment shape are in that section. The skeleton and its checks landed in [`04-scaffold-server`](04-scaffold-server.md).

See [the server stack](../../ARCHITECTURE.md#the-server-stack).
