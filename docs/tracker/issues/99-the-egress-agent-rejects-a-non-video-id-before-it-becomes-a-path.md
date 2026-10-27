# 99: The egress agent rejects a non-video id before it becomes a path

**State:** `ready-for-agent`
**Category:** `bug`
**Blocked by:** None. Can start immediately.

## Observed

The agent's `/fetch` parser accepts any non-empty string as `videoId`. The fetcher joins that value into the output template, and yt-dlp receives it as `-o`. A value containing `..` and a fragment can write outside the per-request temp directory as root. The agent's listing parser also accepts any string, so an invalid entry id can be stored and later crash the download pass.

## What to build

A caller of the egress agent cannot turn a video id into a filesystem path. The socket rejects an id that fails the video-id shape before any process starts. The adapter rejects an invalid entry id before it reaches the server. The download output is built from a validated id and resolves inside the per-request temp directory. An invalid id from a listing does not reject the whole download pass.

## Evidence

- `apps/egress-agent/src/agent/server/server.ts:137-167,299-343`
- `apps/egress-agent/src/main.ts:228-244`
- `packages/youtube/src/ytdlp/ytdlp.ts:330-334`
- `packages/youtube/src/egressAgent/client.ts:196-214`
- `apps/server/src/features/downloads/worker/downloadWorker.ts:127-134`
- Repro: `POST /fetch` on the agent socket with `videoId` set to a value containing `../`; the output template resolves outside the temp directory.

## Acceptance criteria

- [ ] `/fetch` with an id containing `/`, `..`, `#`, or a value that fails the video-id shape returns 400 and starts no yt-dlp process.
- [ ] A listing entry whose id fails the video-id shape is rejected before it is stored or used; the server does not crash.
- [ ] The output template is built from a validated id and resolves inside the per-request temp directory; a test proves a traversal id cannot escape.
- [ ] The download worker's path construction is inside its error boundary, so one invalid id cannot reject the whole pass.
- [ ] Agent, adapter, and server tests cover the socket, the listing, and the worker boundary.

## Agent Brief

- Call `isValidVideoId` in the agent's fetch parser and in the egress client's entry parser.
- Build the output template from the validated id only; assert containment under the temp directory before spawning yt-dlp.
- Move the worker's media-path construction inside the per-track error boundary.
- Add tests for a traversal id, an invalid listing id, and a valid download.
- Keep the local transport's existing validation.

## Verification

- `pnpm --filter @playliberty/egress-agent test`
- `pnpm --filter @playliberty/youtube test`
- `pnpm --filter @playliberty/server test`
- `pnpm run build`
- `pnpm run lint:check`
