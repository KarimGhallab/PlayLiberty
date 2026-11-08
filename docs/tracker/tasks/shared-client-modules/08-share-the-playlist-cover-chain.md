# 08: Share the playlist cover chain

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [`01`](01-scaffold-the-shared-client-packages.md).

## Observed

Each client has a cover hook of about 60 to 74 lines. Both walk the same three levels: the custom cover, then the first track's thumbnail, then the sleeve. Both keep the same three-value failure enum and the same rule that a failure at the custom level falls to the track level, and a second failure ends at the sleeve.

The custom cover URL also appends its version in both hooks. Web maps a level to a string. Mobile maps it to a `MediaSource` with the session headers.

## Expected

`@playliberty/ui-foundation` owns the level decision. One selector takes the playlist and the failure state and returns the level, plus the version to append. Each hook maps the level to its own image value and keeps its own React effect.

## Evidence

- Web hook: 60 lines. Mobile hook: 74 lines.
- Both hold the same `none`, `custom` and `track` failure values.
- Both take the custom cover first, then the track thumbnail, then nothing for the sleeve.
- Mobile carries the token headers because an image route needs them. Web uses the cookie.

## Acceptance criteria

- [x] `ui-foundation` owns one selector for the three cover levels and one failure transition.
- [x] The selector returns the version to append, so the cache-key rule lives in one place.
- [x] A new cover version resets the failure state on both clients.
- [x] Each hook keeps only its own mapping and its own effect.
- [x] The two local failure enums and the two fallback orders are deleted.

## Outcome

`@playliberty/ui-foundation` exports `CoverFailure`, `selectPlaylistCover`, `nextCoverFailure` and `coverChainKey`, plus the `CoverLevel` and `CoverSelection` types. The selector returns the level (`custom`, `track`, `sleeve`) and the version to append: the custom cover's stamp, the first track's id, or none at the sleeve. `nextCoverFailure` records the level that failed and leaves the sleeve alone. `coverChainKey` moves when either the custom version or the first track changes, so the hooks reset there.

The web hook maps the level to a URL and appends the version; the mobile hook maps it to a `MediaSource` with the session headers. Both keep only their mapping and the reset effect. The local `CoverFailure` enums and the two fallback orders are gone.

Verification: `pnpm run build` and `pnpm run lint:check` pass; ui-foundation runs 42 tests; `pnpm run test:unit` passes across the workspace.

## Verification

The package suite covers the three levels, a failure at the custom level, a second failure, and the reset on a version change. `pnpm --filter @playliberty/web test` and `pnpm --filter @playliberty/mobile test` pass. `pnpm run build` and `pnpm run lint:check` pass.
