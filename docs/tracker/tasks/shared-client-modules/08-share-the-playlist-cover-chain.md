# 08: Share the playlist cover chain

**Status:** ready-for-agent
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

- [ ] `ui-foundation` owns one selector for the three cover levels and one failure transition.
- [ ] The selector returns the version to append, so the cache-key rule lives in one place.
- [ ] A new cover version resets the failure state on both clients.
- [ ] Each hook keeps only its own mapping and its own effect.
- [ ] The two local failure enums and the two fallback orders are deleted.

## Verification

The package suite covers the three levels, a failure at the custom level, a second failure, and the reset on a version change. `pnpm --filter @playliberty/web test` and `pnpm --filter @playliberty/mobile test` pass. `pnpm run build` and `pnpm run lint:check` pass.
