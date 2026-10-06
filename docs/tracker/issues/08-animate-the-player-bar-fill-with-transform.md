# 08: Animate the player-bar fill with transform, not width

**State:** `resolved`
**Category:** `enhancement`

## Agent Brief

**Category:** enhancement
**Summary:** The player bar's scrub fill animates `width`, which forces layout on every frame; animate
`transform: scaleX()` from the left edge instead, with an identical result.

**Current behavior:**
The fill is an absolutely positioned block whose inline `width` is a percentage of the scrub, and the
stylesheet transitions that `width`. Every position update lays the bar out, and the detector flags the rule
as `layout-transition`.

**Desired behavior:**
The fill spans the scrub and carries `transform: scaleX(fraction)` with `transform-origin: left center`, and
the stylesheet transitions `transform`. The progress moves on the compositor and the bar is not laid out per
frame. The drawn result is the same.

**Key interfaces:**

- `PlayerBar.tsx` sets the fill's inline `transform` from the fraction it already derives, and no longer sets
  an inline `width`.
- `PlayerBar.module.scss` transitions `transform`, not `width`, and pins the origin to the left edge.

**Acceptance criteria:**

- [x] The fill animates `transform` and no longer animates `width`.
- [x] The fill's inline style is `transform: scaleX(<fraction>)` and carries no `width`.
- [x] A test asserts the composited transform and the absence of the layout width.
- [x] The bar's rendered progress is unchanged at 0, mid and full.
- [x] `impeccable detect` on the two scopes exits 0 with no findings.
- [x] `pnpm run build`, `pnpm run lint` and the unit suites pass.

**Out of scope:**

- The knob's `left` position, which is not transitioned and so is not flagged.
- The seek interaction, the bar's geometry and its tokens.
- Localization.

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

## Observed

The player bar's scrub fill animates `width`:

```scss
/* PlayerBar.module.scss:273 */
&__fill {
  transition: width var(--motion-slow) var(--ease-standard);
}
```

Animating `width` forces layout on every frame. The bundled detector flags it as `layout-transition`
(severity warning) on `PlayerBar.module.scss:273`, and the browser overlay confirmed the same rule. The bar
is mounted across the app and the library route holds it (it returns `null` only while nothing is playing).

## Expected

The fill animates `transform: scaleX()` (or equivalent) with `transform-origin: left`, so the progress
moves on the compositor and does not force layout. The visual result is identical.

## Evidence

- `impeccable detect --json apps/web/src/shared/components apps/web/src/shared/player` → exit 2, one
  finding: `layout-transition`, `PlayerBar.module.scss:273`, `transition: width`.
- Browser overlay console: `[impeccable] 1 anti-pattern found` then
  `layout-transition | transition: width`.
- Critique run `views-library-librarypage-librarypage-tsx-a51b86be`, deterministic scan.
