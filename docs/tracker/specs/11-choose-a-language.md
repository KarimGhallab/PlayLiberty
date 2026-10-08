# Choose a language

Status: ready
Labels: `enhancement`, `ready-for-agent`

## Problem Statement

The interface speaks English and only English. Every word a person reads is an inline English literal in the web
client, or an English sentence the server writes into a problem document and the client prints verbatim. There
is no way to choose another language and no machinery to render one. A French-speaking member of the household
reads a language they may not have, and the person who runs the instance cannot change it for them.

The second problem is the one that decides the shape. The server has no locale signal: identity arrives from
the Pangolin edge as forwarded headers, and no `Accept-Language` is read. Copy is therefore owned in two places
at once, the client and the server, and the server's copy already reaches the screen through the problem's
`detail`. Localizing only the client would leave half the sentences in English; localizing the server would add
a second translation store to a process that cannot tell what language the reader wants.

## Solution

The interface is available in English and French. The web client resolves the language from the browser on
load, remembers an explicit choice, and renders every screen, dialog, toast, state word and relative-time
phrase in it. A language button in the library header opens a two-row menu, `English` and `Français`.

The server stays language-agnostic. It keeps its English prose as a fallback and returns a stable `code` and
structured `params`; the client owns every user-facing sentence and maps the code to a message. The words and
the formatting live in a new `@playliberty/i18n` package, so the web client and the future mobile client render
the same sentences and figures from one place. `ui-foundation` keeps only the primitives language cannot touch.

## User Stories

1. As a listener, I want to read the interface in French, so that I am not made to work in a second language.
2. As a listener, I want to read it in English, so that the language I already use stays available.
3. As a listener, I want the app to start in the language my browser prefers, so that I do not have to set it
   on first use.
4. As a listener, I want my explicit choice remembered, so that I do not set it on every visit.
5. As a listener, I want to change the language from a control I can find, so that switching is one action.
6. As a listener, I want the choice to apply at once, so that I do not reload.
7. As a listener, I want the choice to be per browser, so that my choice does not change what another member
   of the household sees.
8. As a listener, I want every screen in one language, so that a screen is not half English.
9. As a listener, I want the empty states, the dialogs and the toasts translated, so that nothing I read is
   left behind.
10. As a listener, I want the state words (`Up to date`, `Syncing`, `Sync failed`) translated, so that the
    playlist line reads in my language.
11. As a listener, I want the relative times (`Synced 2 days ago`, `yesterday`) translated, so that the sync
    line reads naturally.
12. As a listener, I want the counts (`42 tracks`) written the way my language writes them, so that the line
    is not English with a French word bolted on.
13. As a listener, I want the player bar, the transport labels and the volume notices translated, so that
    playback is in my language too.
14. As a listener, I want a server refusal shown in my language, so that an error I read is not English.
15. As a listener, I want one sentence for a refusal whether the client or the server refused, so that one
    rule reads one way.
16. As a listener, I want my language to survive a reload, so that the app does not forget.
17. As a listener, I want a French sentence that is actually French, so that the translation is not a literal
    one.
18. As a listener, I want an unsupported browser language to fall back to English, so that it is not an
    error.
19. As a listener, I want the page to declare its language, so that a screen reader and the browser agree.
20. As a developer, I want a missing French key to fail the build, so that a half-translated screen cannot
    ship.
21. As a developer, I want the keys to be typed, so that a typo in a key is a compile error.
22. As a developer, I want a lint rule against a hardcoded string, so that new copy cannot bypass the catalog.
23. As a developer, I want the catalog to be one source of words, so that the two clients cannot drift.
24. As a developer, I want the server to return codes and parameters, so that the client can own the sentence
    and the server stays locale-free.
25. As a developer, I want the server's English kept as a fallback, so that an unmapped code still reads and
    a command-line client stays legible.
26. As an operator, I want the language to need no account setting and no server change, so that the
    deployment stays as it is.
27. As a listener, I want no language in the URL, so that a link is the same link whatever my language.
28. As a future mobile listener, I want the same words as the web client, so that the two apps are one
    product.
29. As an operator, I want no translation service and no extraction tooling, so that the two catalogs are the
    whole workflow.

## Implementation Decisions

- **The words live in `@playliberty/i18n`, a new workspace package, and the clients are its only consumers.**
  The package holds the catalogs, the runtime, the locale resolution, the formatters and the React binding. It
  depends on `react` for the binding and on `@playliberty/contracts` for the status and provider enums.
  _Decided here:_ a dedicated package rather than catalogs inside
  `ui-foundation`, so the localization concern has its own seam and the presentation primitives stay free of
  language.
- **The runtime is minimal and hand-rolled, and there is no third-party i18n dependency.** `t(key, params)`
  looks the key up in the active catalog and interpolates `{name}` placeholders. Plurals are catalog entries
  selected by a small category function, not ICU. _Decided here._ The reason is the one that already
  hand-rolls the formatters: the web client and Hermes must say the same sentence, and ICU and `Intl` differ
  by platform. The cost, owning interpolation and plural selection for two locales, is accepted.
- **The catalogs are typed functions, and `en` defines the type.** `en` is the source of truth, its shape is
  the `Messages` type, and `fr` is typed as `Messages`, so a key missing from French is a compile error
  rather than a runtime fallback. `t` is typed against the key union. _Decided here:_ typed functions rather
  than data, so completeness is a type error and the catalog needs no parity test.
- **The keys are symbolic and hierarchical.** A key names the surface and the fact, not the English sentence:
  the empty gallery's heading is a key under the library, the sync state words are a group, the problem
  messages are a group keyed by code. _Decided here:_ symbolic keys rather than natural-language keys, so a
  copy edit does not churn a key and a stale key is visible.
- **The locale is resolved once, per browser, in a fixed order.** An explicit `localStorage` choice wins;
  otherwise the browser's preferred languages are matched by prefix against the supported set (`fr-CA`
  matches `fr`); otherwise `en`. The app resolves on boot and does not listen for `languagechange`, so a
  browser setting change does not flip the interface under the reader. _Decided here._
- **There is no language in the URL and no server-side locale.** The client is the only place a language
  exists: no route changes, no `Accept-Language`, no `Content-Language`, no cookie. _Decided here._ The app is
  private and not indexed, so a localized URL buys nothing and would double the route table and every link.
- **The language button is a globe in the library header opening a two-row menu.** The header keeps its title
  and its add control and gains one button; the menu holds `English` and `Français` with the active row
  checked, and nothing else. It is on the library only. _Decided here,_ from the prototype: the account-menu
  framing was dropped because there is no account surface, no settings and no sign out.
- **The page's `lang` attribute follows the resolved language.** The document declares the language the
  reader is in, so a screen reader and the browser's own typography agree. The app's own name stays
  `PlayLiberty` in both languages.
- **The formatters move into the package; `ui-foundation` keeps only what language cannot touch.**
  `formatRelativeTime`, `formatLastSynced`, `syncStateLabel`, `trackStateLabel`, `providerLabel`,
  `trackCountUnit`, `formatTrackCount` and `formatDuration` live in `@playliberty/i18n` as catalog entries or
  functions; `trackTone`, `sleeveIndex` and `standardEasingBezier` stay in `ui-foundation`. The locale-aware
  ones take the translator; `formatDuration` reads the same in every language and lives beside them so every
  formatter the clients call is in one place. _Decided here._
- **The server returns stable codes and structured parameters, and the client owns the sentence.**
  `ProblemSchema` gains an optional `params` record of string and number values. `code` stays the stable
  identifier, and where the copy varies under one code (the four `playlist_not_found` details) the difference
  travels as a parameter rather than as a new English sentence. `title` and `detail` stay as English
  fallbacks for an unmapped code and for a non-browser consumer. _Decided here._
- **Zod's default messages stop reaching the screen.** A validation failure becomes
  `code: 'validation_failed'` with structured issue parameters (the field path and the issue code), and the
  client maps them. The server no longer ships Zod's English prose. _Decided here._
- **The server's stored failure text stays opaque.** `Track.failureReason` and `SyncRun.error` can carry
  yt-dlp output; they are shown as-is behind a localized label and are never translated. _Decided here._
- **A lint rule flags a hardcoded user-facing string.** JSX text and the known label props are checked, with
  an allowlist for non-copy strings, so new copy cannot bypass the catalog. _Decided here:_ the rule is
  required, not optional, and its selector follows the runtime chosen above.
- **The change owes documentation, and the documentation is part of the work.** [The client owns user-facing copy](../../DESIGN.md#the-client-owns-user-facing-copy) records the
  client-owns-copy decision, the shared package and the hand-rolled runtime; the glossary gains `Language`
  and `Locale`; the design system gains a record for the language button and its menu; the specs tracker
  gains this spec's row. _Decided here._
- **The mobile client consumes the package, and no mobile behavior is specified here.** The package is
  client-neutral by construction; wiring the future mobile client is a later spec. See Further Notes for the
  corpus-convention tension this raises.
- **Inherited constraints are owned by the architecture and not restated here:** identity from the forwarded edge
  headers and fail-closed ([Identity comes from Pangolin's forwarded headers](../../ARCHITECTURE.md#identity-comes-from-pangolins-forwarded-headers)), and the
  client header with the origin check on every mutation
  ([Mutating requests carry a client header and pass origin checks](../../ARCHITECTURE.md#mutating-requests-carry-a-client-header-and-pass-origin-checks)).

## Testing Decisions

- **No new seam in the web client.** The web client keeps the seams it has: component tests through the query
  provider and a mocked network, and the end-to-end journeys through the app. The catalog is consumed through
  the provider those tests already wrap, so a component test keeps asserting the same English sentence it
  asserts today.
- **The new package is the one new seam, and it is a plain unit seam.** `@playliberty/i18n` is pure: locale
  resolution, `t`, interpolation and plural selection are tested directly, with no DOM and no network. It is
  the only new seam, and it is internal to the new package rather than a hook into an existing module.
- **What makes a good test here** is the resolved language and the rendered sentence, never the catalog's
  internals. A test that asserts a key exists is a type check; a test that resolves a browser preference to
  `fr`, or renders a screen in the chosen language, is the feature test.
- **All tests run in `en`.** The catalog's completeness is a type error, so no test walks the French catalog,
  and French wording is the author's and is not asserted. The one new behavior worth a test is the switch
  itself: choose `Français` and the visible copy changes without a reload.
- **The cases that must exist:**
  - an explicit choice beats the browser preference, and the browser preference is used when there is no
    choice;
  - a regional preference (`fr-CA`) resolves to `fr`, and an unsupported language falls back to `en`;
  - `t` interpolates a parameter, and a plural entry is selected for one and for many;
  - a screen renders in the chosen language, and the switch changes it without a reload;
  - the document's `lang` follows the choice;
  - the lint rule rejects a hardcoded string and accepts a translated one, which `pnpm run lint` itself
    exercises rather than a unit test;
  - a problem code renders as the localized sentence, and an unmapped code falls back to the server's
    English.
- **Prior art:** the `@playliberty/i18n` formatter tests, which pin exact English strings and are the level the
  catalog inherits; the web client's component tests, which render through the provider against a mocked
  network; and the end-to-end journeys, which assert accessible names.

## Out of Scope

- The mobile client and its wiring; the package is the seam it will use, and no mobile behavior is specified.
- A per-account language preference; the choice is per browser and the account has no settings surface.
- Localized URLs, server rendering, and `Accept-Language` handling.
- Server-side translation; the server stays language-agnostic and keeps English as a fallback.
- Translating `Track.failureReason` and `SyncRun.error`; they are tool output.
- A translation service, extraction tooling, and any locale beyond `en` and `fr`.
- Localizing user content: playlist names, track titles and account names are the source's or the user's, not
  the app's.

## Further Notes

- **The prototype and its verdict.** Four placements were built as a throwaway route and the language button
  in the header was chosen. The prototype is dev-only, lives under the web client's source, and is deleted
  when the button is folded into the real header. It is not part of this spec's deliverable.
- **The corpus-convention tension.** The specs tracker states this corpus is web only and that no spec is
  written to leave room for mobile. The package boundary here is chosen so the future mobile client consumes
  the same catalogs, because the original request named both clients, while no mobile behavior is specified.
  If the corpus is to stay strictly web only, this is the line to change.
- **The test trade, restated.** Testing only in `en` means the typed catalog proves every French key exists
  but nothing proves the French reads well. The French is authored by a French speaker, which is why the
  trade is acceptable; it is recorded here so a later reader does not read it as an oversight.
- **Why no `Intl`.** `Intl.NumberFormat` varies by Android version on Hermes and `Intl.RelativeTimeFormat` is
  absent there. The hand-rolled formatters and the hand-rolled plural selection keep the web client and the
  mobile client on one output, which is the same reason the formatters are already hand-rolled.
