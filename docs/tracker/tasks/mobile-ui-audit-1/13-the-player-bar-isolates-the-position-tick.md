# 13: The player bar isolates the position tick

**Status:** ready-for-agent
**Labels:** `enhancement`, `ready-for-agent`
**Source:** [The mobile app's UI misses its contract](../../issues/105-the-mobile-apps-ui-misses-its-contract.md)
**Blocked by:** None. Can start immediately.

## Observed

The bar subscribes to the player's position in the component that also draws the cover, the title, the playlist name
and the morph glyph. Every position update re-renders the whole bar, including both bar pages, two cover images, two
pressables and sixteen SVG frame trees. This happens while the user scrolls a list behind the bar.

## Expected

A position update repaints the seek fill and the elapsed time only. The cover, title, playlist name and glyph do not
re-render.

## Evidence

- `apps/mobile/src/player/PlayerBar/PlayerBar.tsx`: `useBarState` reads `positionSeconds`; `BarPage` draws `Artwork` and
  `PlayPauseGlyph`.
- `packages/tokens/src/morph.ts`: `frames: 8`.

## Acceptance criteria

- [ ] The position subscription lives in the seek bar or a child that only draws the fill and the elapsed time.
- [ ] `Artwork` and `PlayPauseGlyph` are memoized and do not re-render on a position update.
- [ ] A render-count test asserts that a position change does not re-render the cover or the glyph.
- [ ] The seek still follows the finger and the store, and the bar's swipe still moves the queue.

## Verification

`pnpm --filter @playliberty/mobile run test`, `pnpm --filter @playliberty/mobile run typecheck`, `pnpm run lint:check`
and `pnpm run build` pass. The render-count test fails if the cover re-renders on a tick, and the Maestro
`player-journey` flow passes.
