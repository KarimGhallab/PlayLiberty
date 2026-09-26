# Define the design system token layer

Status: open
Labels: `enhancement`, `ready-for-agent`

## Objective

Record the structural decisions of the design system in `docs/adr/0009-design-system-token-layer.md`, so the design work and both clients are built against one agreed mechanism. This ticket decides no visual values. The mood, the palette, the typeface, and every token value belong to task `09`.

## Context

Read `docs/DESIGN.md`, `docs/adr/0005-web-stack.md`, `docs/adr/0007-mobile-stack.md`, `docs/ARCHITECTURE.md`, `docs/GLOSSARY.md`, and `docs/tracker/tasks/TASKS_TRACKER.md` first.

The problem to solve: the two clients style themselves through incompatible runtimes. Web is SCSS with CSS Modules and BEM over CSS custom properties, mobile is React Native `StyleSheet` over a typed token module. Components therefore cannot be shared between them, and only values and pure decisions can. Tailwind and NativeWind are already rejected in ADR 0005 and ADR 0007, so there is no utility-class pipeline to lean on.

The existing tokens in `docs/DESIGN.md` are provisional and are not a decision this ticket ratifies.

## Scope

### The ADR

- The decision and the alternatives weighed against it: a shared component package, a utility-class framework, CSS-in-JS, and a hand-maintained mirror of the values on each platform.
- TypeScript is the single source of the token values. A build step emits CSS custom properties from it, and nothing generated is committed, since `dist` is already gitignored.
- Tokens are flat and carry no `var()` alias, because React Native cannot resolve one. An aliased token would reach mobile as a literal string it cannot use, and the app is dark only with a single theme, so there is no re-theming benefit to buy with that cost.
- The unit contract: Paper and CSS store lengths as `"8px"` strings, the repository source stores them as the number `8`, and the emitter is the only place a unit is ever added.
- `packages/tokens` holds values and nothing else.
- `packages/ui-foundation` holds UI decisions and nothing else. It formats durations, relative times, and counts, and it maps a track's file and source status to a tone. If a module renders, it does not belong in this package.
- The tone is platform independent; the colour each tone resolves to is chosen per client, so no token value is duplicated across the two.
- Components are duplicated per client. Only values and pure decisions are shared.
- Paper is the design surface, `docs/DESIGN.md` is the committed record of what was decided.
- Values reach the repository through Paper's token and computed-style read tools, never by reading a value off a screenshot.
- Parity between Paper and the repository is a documented manual step, because CI cannot reach the Paper MCP. Say so plainly rather than implying a test enforces it.

### The contract task 09 must satisfy

Record the requirements that bound the design, so the design ticket is decidable without pre-deciding it:

- Dark only, no light theme, per ADR 0005.
- Every text pairing clears WCAG AA.
- A track's sync state is never carried by colour alone.
- The five track states are expressible with the token set.
- Every value survives both platforms, so nothing that only CSS can express.
- Album art stays the most saturated thing on screen, carried over from the existing do's and don'ts.

### The token categories

Fix the categories the app needs, without fixing any value: surfaces, text, hairlines, spacing, shape, type sizes, motion durations, a focus ring, stacking order, and one tone per track state.

## Out of scope

Any colour value, mood, typeface, or spacing value. The Paper file. The two packages. Both belong to tasks `09` and `10`.

## Blocking edges

None. Can start immediately.

## Verification

- `docs/adr/0009-design-system-token-layer.md` exists, follows the ADR format of ADR 0005, and is listed nowhere as decided work that has not happened.
- The ADR names no colour value, mood, or typeface. Read it and confirm.
- The row for this ticket is added to `docs/tracker/tasks/TASKS_TRACKER.md`.
- `pnpm run build` and `pnpm run lint` pass, which they do trivially since this ticket changes only documentation.
