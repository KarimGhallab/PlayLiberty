# Choose a language

Status: resolved
Labels: `enhancement`

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

## Implementation Decisions

- **The words live in `@playliberty/i18n`, a new workspace package, and the clients are its only consumers.**
  The package holds the catalogs, the runtime, the locale resolution, the formatters and the React binding. It
  depends on `react` for the binding and on `@playliberty/contracts` for the status and provider enums.
  _Decided here:_ a dedicated package rather than catalogs inside
  `ui-foundation`, so the localization concern has its own seam and the presentation primitives stay free of
  language.
- **The runtime is minimal and hand-rolled, and there is no third-party i18n dependency.** `t(key, params)`
  looks the key up in the active catalog and interpolates `{name}` placeholders. Plurals are catalog entries
  selected by a small category function, not ICU. The reason is the one that already
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
  browser setting change does not flip the interface under the reader.
- **There is no language in the URL and no server-side locale.** The client is the only place a language
  exists: no route changes, no `Accept-Language`, no `Content-Language`, no cookie. The app is
  private and not indexed, so a localized URL buys nothing and would double the route table and every link.
- **The language button is a globe in the library header opening a two-row menu.** The header keeps its title
  and its add control and gains one button; the menu holds `English` and `Français` with the active row
  checked, and nothing else. It is on the library only. _Decided here,_ from the prototype: the account-menu
  framing was dropped because there is no account surface, no settings and no sign out.
- **The page's `lang` attribute follows the resolved language.** The document declares the language the
  reader is in, so a screen reader and the browser's own typography agree. The app's own name is localized
  with the interface: `PlayLiberty` in English and `PlayLiberté` in French.
- **The formatters move into the package; `ui-foundation` keeps only what language cannot touch.**
  `formatRelativeTime`, `formatLastSynced`, `syncStateLabel`, `trackStateLabel`, `providerLabel`,
  `trackCountUnit`, `formatTrackCount` and `formatDuration` live in `@playliberty/i18n` as catalog entries or
  functions; `trackTone`, `sleeveIndex` and `standardEasingBezier` stay in `ui-foundation`. The locale-aware
  ones take the translator; `formatDuration` reads the same in every language and lives beside them so every
  formatter the clients call is in one place.
- **The server returns stable codes and structured parameters, and the client owns the sentence.**
  `ProblemSchema` gains an optional `params` record of string and number values. `code` stays the stable
  identifier, and where the copy varies under one code (the four `playlist_not_found` details) the difference
  travels as a parameter rather than as a new English sentence. `title` and `detail` stay as English
  fallbacks for an unmapped code and for a non-browser consumer.
- **Zod's default messages stop reaching the screen.** A validation failure becomes
  `code: 'validation_failed'` with structured issue parameters (the field path and the issue code), and the
  client maps them. The server no longer ships Zod's English prose.
- **The server's stored failure text stays opaque.** `Track.failureReason` and `SyncRun.error` can carry
  yt-dlp output; they are shown as-is behind a localized label and are never translated.
- **A lint rule flags a hardcoded user-facing string.** JSX text and the known label props are checked, with
  an allowlist for non-copy strings, so new copy cannot bypass the catalog. _Decided here:_ the rule is
  required, not optional, and its selector follows the runtime chosen above.
- **The change owes documentation, and the documentation is part of the work.** The documentation records the
  client-owns-copy decision, the shared package and the hand-rolled runtime; the glossary gains `Language`
  and `Locale`; the specs tracker gains this spec's row.
- **The mobile client consumes the package, and no mobile behavior is specified here.** The package is
  client-neutral by construction; wiring the future mobile client is a later spec.
- **Inherited constraints are owned by the architecture and not restated here:** identity from the forwarded edge
  headers and fail-closed ([Identity comes from Pangolin's forwarded headers](../../ARCHITECTURE.md#identity-comes-from-pangolins-forwarded-headers)), and the
  client header with the origin check on every mutation
  ([Mutating requests carry a client header and pass origin checks](../../ARCHITECTURE.md#mutating-requests-carry-a-client-header-and-pass-origin-checks)).

## Out of Scope

- The mobile client and its wiring; the package is the seam it will use, and no mobile behavior is specified.
- A per-account language preference; the choice is per browser and the account has no settings surface.
- Localized URLs, server rendering, and `Accept-Language` handling.
- Server-side translation; the server stays language-agnostic and keeps English as a fallback.
- Translating `Track.failureReason` and `SyncRun.error`; they are tool output.
- A translation service, extraction tooling, and any locale beyond `en` and `fr`.
- Localizing user content: playlist names, track titles and account names are the source's or the user's, not
  the app's.
