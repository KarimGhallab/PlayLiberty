# Share design tokens and UI decisions across the clients, not components

`packages/tokens` is the single source of the design values and holds values and nothing else: TypeScript data with lengths and durations as unitless numbers. Its build compiles the package, then runs the emitted emitter, which appends `px` to lengths, `ms` to durations, passes colors through verbatim, and writes a flat CSS custom-property stylesheet into `dist` for the web client; nothing generated is committed, since `dist` is already gitignored. The tokens are flat and carry no `var()` alias: React Native cannot resolve an alias, so an aliased token would reach mobile as a literal string it cannot use, and with a single dark theme there is no re-theming benefit to buy with that cost. The unit lives in exactly one place: the design stylesheet and CSS speak `"8px"` strings, this repository's source speaks the number `8`, and the emitter is the only code that ever adds a unit. `packages/ui-foundation` holds the platform-independent UI decisions and renders nothing; if a module renders, it does not belong in the package. It formats a duration, a relative time, and a count, and it maps a track's file status and source status to a tone. The tone is the shared decision and its color is chosen per client from that client's palette, so no token value is duplicated across the two. Components are duplicated per client; only values and pure decisions are shared. The design surface is a set of static HTML specimens under `docs/design/` that read one shared stylesheet of custom properties, and `docs/DESIGN.md` is the committed narrative record of what was decided. Values reach the repository by transcribing that stylesheet into the package source and reviewing the result as a diff, which is a deliberate manual step rather than an automated extraction, and no value is ever read off a screenshot.

The two clients share no styling runtime: web is SCSS with CSS Modules and BEM over CSS custom properties, and mobile is React Native `StyleSheet` over a typed module. A shared component package would need two implementations of every component and would share only the interfaces, which is the duplication above with an extra package to maintain, while a utility-class pipeline is already rejected on both sides (ADR 0005, ADR 0007). What can be shared is the values and the decisions that do not render, which is why there are two packages rather than one: `packages/tokens` is data plus the emitter, `packages/ui-foundation` is pure functions over that data, and neither imports a renderer. The values must be literal types at build time because mobile consumes the module directly, so emitting CSS from TypeScript serves the web without making CSS the source for mobile. Flat tokens are a consequence of React Native's inability to resolve `var()`, not a style preference, and the single dark theme removes the only reason a web-only alias would have existed.

The contract the design of task `09` must satisfy:

- Dark only, no light theme, per ADR 0005.
- Every text pairing clears WCAG AA.
- A track's sync state is never carried by color alone.
- The five track states are expressible with the token set.
- Every value survives both platforms; nothing that only CSS can express.
- Album art stays the most saturated thing on screen, carried over from the do's and don'ts in `docs/DESIGN.md`.

The token set fixes these categories, with one value per track state, and fixes no value:

- surfaces
- text
- hairlines
- spacing
- shape
- type sizes
- a font family per role, since React Native reads a family name directly and takes no CSS
- motion durations
- a focus ring
- stacking order
- one tone per track state

Parity between the design stylesheet and the package source is a test rather than a documented manual step, because both now live in this repository and CI can compare them. The design stylesheet is a snapshot of what was decided on a given date and is not a live consumer of the package, so it is never rewritten: a value change is made in `packages/tokens` and re-emitted, and the design file is left standing as the record of the earlier decision.

Alternatives rejected:

- A shared component package: the two runtimes share no rendering model, so every component would ship twice inside one package; the shareable part is the values and the pure decisions, not the markup.
- A utility-class framework (Tailwind on web, NativeWind on mobile): already rejected in ADR 0005 and ADR 0007, and it would still be two pipelines with no shared output.
- CSS-in-JS: DOM-only, so it cannot be the source for mobile, and already rejected for web in ADR 0005.
- A hand-maintained mirror of the values on each platform: two edits per change and no source of truth, which is the drift this decision exists to prevent.
- CSS custom properties as the source, with the typed module generated from them: CSS is not executable data on mobile, and it would make the web's format the source for the phone's values.
- A token file in a third format with a token tool (W3C DTCG JSON and the like): a schema and a toolchain for a small set of values, when the workspace builds with plain `tsc` and has no script runner, and TypeScript already gives literal types.
- Aliased tokens, where one custom property points at another: React Native cannot resolve `var()`, and with one dark theme there is nothing to re-theme.
- Carrying a tone's color in shared code: the tone is the shared decision and the color is the client's, so a shared color would copy one client's palette value into the other.
- A hosted visual design tool as the design surface: one was tried and abandoned. It meters AI tool calls, which puts a weekly ceiling on iteration, and design work proceeds by looking, deciding, and looking again. It also rewrites the literals it stores, normalising hex case and reformatting colours, so its export is not what was entered and cannot be transcribed mechanically, and its style-read API can disagree with its own renderer, so a value read back from it need not be the value on screen. Hand-written HTML specimens have none of those failure modes, cost nothing, are diffable, and are exact by construction.

Amendment, from task `09`: the category list above gained a font family per role. A family is a custom property like any other, it reaches web as `font-family` and mobile as `fontFamily`, and leaving it out would have put the type system somewhere other than the one place every other value lives.

Amendment, from task `09`: the design surface changed from a hosted visual design tool to hand-written HTML specimens under `docs/design/`, after the tool's free tier proved to cap iteration at a hundred tool calls a week. Two consequences. Values now reach the package by a reviewed transcription rather than a tool export, which is slower per change and trustworthy every time. And parity between the design stylesheet and the package source became a test instead of a documented manual step, because both sides are in this repository and no external service has to be reachable from CI.
