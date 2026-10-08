# 08: Animate the player-bar fill with transform, not width

**State:** `resolved`
**Category:** `enhancement`

## Outcome

Done. The fill moves on the compositor instead of laying the bar out every frame.

- `PlayerBar.tsx` writes `style={{ transform: 'scaleX(' + fraction + ')' }}` on the fill and no longer
  writes a percentage `width`.
- `PlayerBar.module.scss` gives the fill `inset: 0` and `transform-origin: left center`, and transitions
  `transform` where it transitioned `width`. `border-radius: inherit` keeps the track's pill; the leading cap
  sits under the knob, so the scale's one softened radius is covered.
- Test: the scrub's fill carries `scaleX(0.5)` at the midpoint and an empty inline `width`.

Verification: `impeccable detect --json apps/web/src/shared/components apps/web/src/shared/player` exits 0
with `[]` (the `layout-transition` finding is gone); `pnpm run test:unit` (PlayerBar 12 tests) and
`pnpm run lint` pass. Not committed.
