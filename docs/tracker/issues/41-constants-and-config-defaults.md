# 41: Constants and config defaults

**State:** `resolved`
**Category:** `enhancement`
**Blocked by:** None. Can start immediately.

## Outcome

The constant and default restatements are gone. Removed the `loadConfig.test.ts` "applies defaults for optional values" test (nine defaults) and the `pruneCron` pass-through assertion, plus the literal values in `ytdlpArgs.test.ts:93`, `easing.test.ts:10`, `emitTokens.test.ts` (the exports map, with the self-referencing resolve checks kept), `createTranslator.test.ts:63-66` (branding and library prose copy, with pluralization kept), and the default page window in `playlistRoutes.test.ts:230-231`, `:1008-1009` and the echoed window at `:1074-1075`. The parsing, normalization and production edge-assertion tests in `loadConfig.test.ts` stayed. Kept the yt-dlp command contract, the sleeve range, the concurrency cap, the media path layout, the cache headers, the language round-trip, the SSE keepalive, the edge-assertion rules, and the translator pluralization.
