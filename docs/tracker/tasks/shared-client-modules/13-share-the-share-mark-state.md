# 13: Share the share mark state

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** None. Can start immediately.

## Observed

Both clients choose the same three share states. A playlist the account does not own is a collaborator mark. An owned playlist with shares is a shared mark. An owned playlist without shares is a private mark. Each client repeats the branch and the label key, then maps the state to its own glyph and tone.

## Expected

`@playliberty/ui-foundation` owns the state and the label key. One selector takes the playlist and returns the state and the label. Each client maps the state to its own glyph and its own tone.

## Evidence

- Web holds the branch in `shareMark` inside the playlist header seam.
- Mobile holds the same branch in its playlist identity module.
- The label keys `header.collab`, `header.shared` and `header.private` appear in both.
- The glyphs differ because the icon packages differ.

## Acceptance criteria

- [x] `ui-foundation` owns the three share states and their label keys.
- [x] Both clients delete their local branch and call the selector.
- [x] Each client keeps its glyph and tone mapping.
- [x] The package suite covers a collaborator, an owned shared playlist and an owned private playlist.

## Outcome

`@playliberty/ui-foundation` exports `shareMarkOf`, `ShareMarkState` and the `ShareMark` type. The selector returns `collab`, `own-shared` or `own-private` with its label key.

Web maps the state to its Tabler glyph through a local icon table. Mobile keeps its share-mark adapter: it maps the state to its own glyph and keeps the tone rule. The local branch in both clients is deleted.

Verification: ui-foundation runs 45 tests, the web shared API and header suites 86, the mobile affected suites 85. `pnpm run build`, `pnpm run lint:check` and `pnpm run test:unit` pass.

## Verification

`pnpm --filter @playliberty/ui-foundation test` proves the three states. `pnpm --filter @playliberty/web test` and `pnpm --filter @playliberty/mobile test` pass. `pnpm run build` and `pnpm run lint:check` pass.
