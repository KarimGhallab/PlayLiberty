# 92: Shift+N and Shift+P do not skip

**State:** `resolved`
**Category:** `enhancement`

**Blocked by:** #91 for the key-ownership predicate it binds against. #91 is resolved.

## Outcome

`Shift+N` skips forward and `Shift+P` skips back, from the bar's window handler and behind `ownsGlobalKey`, so they fire from the page body and with a button focused while staying out of text entry, an open menu and a dialog. Shift must be the only modifier: `ctrl`, `alt` and `meta` still stand down before any branch, which leaves `Ctrl+Shift+P` to the browser.

Both chords call the store's `skipNext` and `skipPrevious`, the actions the bar's own buttons call, so the five-second grace window, the in-place restart past it, the clamp at the last track and the `isPlaying: true` resume are the buttons' behaviour rather than a second definition. With no queue the handler returns before cancelling anything, so both chords are silent no-ops. A held chord keeps skipping, unlike Space, which ignores its repeats.

The bar's three transport buttons carry `aria-keyshortcuts`: `Space` on play and pause, `Shift+P` on previous, `Shift+N` on next.

The two step buttons also name their chord in sight: hovering one, or reaching it with the keyboard, floats two `kbd` caps above it, `Shift` and `P` or `N`. The play button carries no visual hint, Space being the one key nobody needs told, and the caps are `aria-hidden` because `aria-keyshortcuts` already says it. Nothing shows at rest, so the bar keeps its height, and the modifier reads `Maj` in French. No test owns the hover tip: it is presentation, and jsdom cannot hover. No help surface, tooltip library or settings was added. No help surface, tooltip or settings was added.

Verification: `pnpm run build` and `pnpm run lint` pass; the unit suites pass (tokens 2, i18n 37, youtube 31, ui-foundation 5, server 381, web 560). The bar's tests hold both chords from the body and from a focused button, the grace window and its restart on a middle track, the clamp on the last track, the three surfaces that keep the key (a text field, a menu, a dialog), each extra modifier, the empty queue not cancelling, the chord on the playlist route, and the three shortcut attributes.

The hint was checked in Chrome against the running app with a stub API and a playing queue: hovering the previous step floated `Shift P` above it with the play button bare, the caps sitting over the page rather than inside the bar. The prototype it came from was deleted, along with its dev-only route.
