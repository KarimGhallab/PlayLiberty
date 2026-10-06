# 08: Animate the player-bar fill with transform, not width

**State:** `needs-triage`
**Category:** `enhancement`

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
