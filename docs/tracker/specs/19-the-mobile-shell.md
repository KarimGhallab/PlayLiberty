# The mobile shell

Status: ready
Labels: `enhancement`, `ready-for-agent`

## Problem Statement

The mobile client exists as a stack decision and a scaffold ticket, and nothing else. The thirteen specs that follow
this one describe what the app does on its screens, and every one of them depends on decisions no screen can own:
which routes exist, where a signed-out person lands, how the interface language is resolved on a device that has
no browser, how live updates behave when the app is backgrounded, what happens when the access token expires, how
the shared design values become React Native styles, and what the accessibility baseline is. Task `06` builds a
skeleton from those assumptions; a ticket cannot be the record a dozen specs cite.

The web's answers cannot be inherited, because they are browser-shaped. The language provider writes
`document.documentElement.lang` and defaults to `window.localStorage` and `navigator.languages`. The live-update
client holds an `EventSource`. The player persists to `sessionStorage` and flushes on `pagehide`. The focus ring and
the keyboard contract are the web's accessibility answer. React Native has none of these, and a mobile spec that
assumed them would invent a different answer on each screen.

The account surface is the third gap. The web has none: identity is the edge's, sign-out is the edge's, and the
language control sits in the two headers. The mobile app carries its own token for 180 days, so it needs a way to
forget it, and the egress console needs a way in for an admin. That surface does not exist on the web, and the
screen inventory decision that removed it was taken before the token and the egress console were in scope.

## Solution

One Expo app with four routes and one sheet. The library is the root, the playlist detail is pushed over it, and a
bare track and the egress console are routes of their own. The account is a sheet over whatever is open, holding
the display name, the admin mark, the language control, Sign out, and the egress door for an admin. A missing or
refused token shows the signed-out state in place of the library's content, and nothing else is reachable from it.
Live updates run while the app is foregrounded and re-read on the way back. The design values arrive as React
Native styles from the shared token module, and the shared language provider gains the one seam it needs to serve a
device instead of a browser.

## User Stories

1. As an account on a phone, I want the app to open on my gallery, so that my playlists are the first thing I see.
2. As an account, I want the app to remember my access for months, so that I do not sign in every time I open it.
3. As a person who has never signed in, I want one clear action on a signed-out screen, so that I know what to do.
4. As a signed-out person, I want nothing else reachable, so that I do not meet empty screens I cannot fill.
5. As an account, I want a sheet that names me and offers Sign out, so that I can hand the phone over safely.
6. As an admin, I want the egress console reachable from that sheet, so that I can manage exits without a laptop.
7. As a non-admin, I want the egress console absent, so that I am not offered a screen I cannot use.
8. As a French-speaking account, I want the app to open in French when my phone is French, so that I read my own language.
9. As an account, I want to switch the language from the sheet, so that I can change it without changing my phone.
10. As an account, I want the choice remembered, so that it survives a restart.
11. As an account, I want a playlist I open to be pushed over the gallery, so that the platform back gesture returns me.
12. As an account, I want the back gesture to be the way back, so that the app behaves like the phone it runs on.
13. As a recipient of a shared track link, I want the link to open the track in the app, so that one press plays it.
14. As a recipient of a link the app cannot resolve, I want a page that says so and a way home, so that I am not stranded.
15. As a listener, I want the screens to update while I use the app, so that a sync finishing changes what I see.
16. As a listener, I want the app to catch up when I return to it, so that a phone in my pocket does not show stale data.
17. As a listener, I want no battery spent on a background connection, so that the app does not cost me a charge.
18. As a person whose token expired, I want to be asked to sign in again rather than see a broken screen, so that I know what happened.
19. As a person whose token expired mid-playback, I want no browser to appear over the music, so that nothing is yanked from under me.
20. As a person who signs out, I want the token gone from the device, so that a lost phone is not a lost account.
21. As an account, I want a refused request explained in my language, so that I can act on it.
22. As a screen-reader user, I want every control named and given a role, so that I can operate the app without sight.
23. As a screen-reader user, I want the state words read, not just the colours, so that a failed track is audible as failed.
24. As a user with large text, I want the interface to respect my setting, so that I can read it.
25. As a user with reduced motion, I want animation removed, so that the app does not make me ill.
26. As a thumb user, I want every control at 44 points, so that I can hit it.
27. As an account, I want the app to look like the web client, so that the two are one product.
28. As an account, I want the app to start clean after Android kills it, so that it never resumes music I did not ask for.
29. As a developer, I want one owner for server state, so that no screen keeps its own copy.
30. As a developer, I want the shared catalogs and tokens consumed, not copied, so that the two clients cannot drift.

## Implementation Decisions

- **The app is `apps/mobile`, the Expo SDK 57 app the architecture pins** (React Native 0.86.3, React 19.2, New
  Architecture, TypeScript). This spec adds no runtime dependency beyond the pinned stack and `expo-localization`,
  which is the only capability the shell itself needs. See
  [the mobile stack](../../ARCHITECTURE.md#the-mobile-stack).
- **Four routes and one sheet.** The library is the root, the playlist detail is pushed, the bare track and the
  egress console are routes of their own, and an unknown path lands on a not-found body with one way home.
  `Decided here:` the track and egress routes are full screens with their own reads and their own back-stack, so
  the rule that rejects a route existing only to be a state of another route does not reach them. The account is a
  React Native modal sheet owned by the shell, not a router route, for exactly that reason.
- **There is no tab bar, no drawer and no sidebar.** The library is the root, the detail is pushed, and the
  platform's own back gesture and back button are the way back. `Decided here:` a header back control would be a
  second way to do what the phone already does, and the screen inventory settled that the app has no navigation
  chrome.
- **The signed-out state replaces the library's content area.** It is a state of the root route, never a route of
  its own, and it holds the app's name, one sentence and one Sign in action. While it is drawn, no read is issued
  and no other screen is reachable. `Decided here:` a route for a state reachable from one place is the shape the
  inventory already rejected, and a sheet over an empty library would leave the library visible behind it.
- **The account sheet holds the display name and avatar from the account read, the admin mark, the language
  control, Sign out, and the egress door for an admin only.** `Decided here:` the sheet is the one surface the web
  does not have, and it exists because the app owns a token the edge does not. It is a settings surface in
  everything but name, and this spec reverses the inventory decision that removed the account screen.
- **Sign out forgets the token on the device and returns to the signed-out state.** It clears the stored token, the
  language is kept, and the query cache is cleared so no collaborator's data survives the handover. It calls no
  server route, because the app has no revocation path: the token remains valid on the instance until it expires.
  `Decided here:` the consequence is recorded rather than solved, and revocation through the Pangolin Integration
  API is the feature that would add a call here.
- **The language is resolved once per launch, in the fixed order the shared package already owns:** an explicit
  choice, then the device's preferred locales matched by base, then English. There is no `languagechange`
  listener and no locale in a route. The device's tags come from `expo-localization`.
- **One language provider serves both clients.** `packages/i18n`'s binding gains an injected seam for the write it
  makes when the language changes, defaulting to the document's `lang` attribute so the web is unchanged, and its
  storage parameter becomes a two-method port rather than the DOM `Storage` interface. The mobile client passes no
  document write. `Decided here:` a second provider would duplicate resolution and translation for copy that is
  already shared, and the seam is one line.
- **The language choice lives in `expo-secure-store` beside the token.** `Decided here:` one storage owner instead
  of a new dependency for a few bytes. The cost is recorded: the value is not a secret and the store is slower,
  and it is read once per launch and written when the choice changes.
- **TanStack Query owns server state and the keys are the web's keys.** No screen fetches on its own, and nothing
  server-derived is copied into the Zustand store. Mutations invalidate the reads they changed, as the web's map
  says, and only the pin and the sort are optimistic, matching the web.
- **Live updates are a foreground-only stream.** One connection while the app is in the foreground; the app closes
  it when it goes to the background and, on return, refetches every query it holds and reconnects. There is no
  background socket and no polling interval anywhere. `Decided here:` a background socket would spend battery to
  deliver invalidations to a screen nobody is looking at, and the architecture forbids a polling interval.
- **The stream is read with a fetch-based reader, not `EventSource`.** React Native has no `EventSource`, the
  request must carry the two access-token headers, and a browser `EventSource` cannot set headers. The reader
  parses the same event framing the server already sends and reconnects from a backoff timer, so a session the edge
  keeps refusing stops retrying. `Decided here:` a polyfill dependency would add a second transport to secure and
  test for one endpoint.
- **A missing or refused token at launch runs provisioning.** A `401` mid-session clears the token and shows the
  signed-out state; it never opens the browser over a playing track. `Decided here:` the web's re-auth navigation
  has no mobile equivalent, and the signed-out state is the recovery the app already draws.
- **Every request carries the access token headers and every mutation carries the client header.** Reads carry no
  client header, and nothing mutates on a `GET`. The stream carries the token headers too.
- **A refusal shows the problem's title, mapped through the catalog by its code.** The app never prints a status
  number and never invents a sentence for a code it was given a document for.
- **Styling is one `StyleSheet` helper layer over the typed token module.** No UI kit, no CSS-in-JS runtime, no
  light theme. The helper layer is built once, not per screen, and it owns the spacing, type, radius and tone
  lookups the screens call. `Decided here:` the shared values are the design system, and a component library would
  be a second one.
- **There is one column at every width.** The web's 1056 content column and its breakpoint are the browser's; the
  app is the phone frame the design already draws at 390, at whatever width the device has. A tablet arrangement is
  not designed and not claimed.
- **The accessibility baseline is the app's, not the browser's.** Every touchable has an accessible name and a role,
  every control meets a 44 by 44 point target, Dynamic Type is respected with a capped multiplier only where a
  fixed layout would break, and reduced motion is read from `AccessibilityInfo` once and applied. The web's focus
  ring and its keyboard contract are dropped with the disposition recorded: touch and the platform's screen-reader
  actions replace them, and every control still carries a name and a role.
- **Only the token survives a kill.** The queue, its order and the position are memory-only, so a relaunch starts
  with no player. `Decided here:` the web keeps them per tab, and this is a deliberate divergence: a phone that
  resumes audio on launch is hostile, and Android kills backgrounded apps often. The cost is recorded: a listener
  who returns to a killed app rebuilds the queue.
- **The app ships no offline path and no service worker.** Streaming is the only delivery, as the glossary says,
  and a client-side copy is a non-goal.
- **The stale statements are amended as part of this work.** The specs tracker gains the mobile corpus and loses
  its "no spec is written to leave room for mobile" clause; spec `16` loses its mobile exclusion; task `13`'s
  screen inventory gains the fourth route and the account sheet; the architecture's "the mobile client is planned"
  and the product's "not built yet" move on; `DESIGN.md` gains the mobile clauses and the mobile paths in its
  "Where a change goes" table; the glossary's `Language` row stops saying the control sits on both screens.
- **Inherited constraints are owned by the architecture and not restated here:** identity from the forwarded edge
  headers and fail-closed
  ([Identity comes from Pangolin's forwarded headers](../../ARCHITECTURE.md#identity-comes-from-pangolins-forwarded-headers)),
  the client header and origin checks on mutations
  ([Mutating requests carry a client header and pass origin checks](../../ARCHITECTURE.md#mutating-requests-carry-a-client-header-and-pass-origin-checks)),
  and the deployment boundary
  ([Deployment behind the Pangolin edge](../../ARCHITECTURE.md#deployment-behind-the-pangolin-edge)).

## Testing Decisions

- A test earns its place only if it fails when behaviour a user relies on changes. The shell's tests assert which
  screen is drawn for a given state, which route a link resolves to, that no read is issued while signed out, and
  that a refused token lands on the signed-out state. They do not assert style values, the sheet's animation, or
  the shape of the storage adapter.
- **The shared provider's seam is tested in `packages/i18n`**, at its existing seam: the injected write is called
  with the new language, the storage port is written, and the resolution order is unchanged. The web's provider
  tests must pass untouched, which is the proof that the seam did not move the web's behaviour.
- **The shell is tested at the app's own seams**: the router for the four routes and the not-found body, the account
  sheet for its items and their gating, the signed-out state for the absence of reads, and the stream reader for
  open, close on background, refetch and reconnect on return. Prior art is the web's router tests and its
  `useEventStream` tests.
- **The critical journeys are Maestro flows on a physical Android device**: the app opens on the gallery and the
  account sheet opens and closes; a signed-out app shows one action; a deep link to a track opens the track route;
  the language switch renders French after a restart. This is the seam that exercises the real app, the real
  secure store and the real router.
- **Cut tests:** no test of the sheet's gesture, the token's encryption, the exact copy of the signed-out sentence,
  or the backoff's timings.

## Out of Scope

- Offline playback, downloads, a service worker, and any client-side copy of a track.
- iOS builds and iOS verification. The code stays cross-platform; the parity claim is Android's.
- A tablet or landscape arrangement, a tab bar, a drawer, and a sidebar.
- A per-account language preference, and any language beyond English and French.
- Token revocation on the server, and any server-issued device-token scheme.
- Push notifications other than the playback notification, which spec `24` owns.
- A settings screen beyond the account sheet's items, and any preference field the contracts do not have.
- Analytics, crash reporting, and any third-party telemetry.
- A UI component library, a styling runtime, and a light theme.

## Further Notes

- The packages the app installs as its capabilities land: `expo-localization` here, `expo-crypto` and
  `expo-web-browser` in spec `20`, `expo-clipboard` in spec `30` and `expo-image-picker` in spec `29`. They are
  named in the spec that needs them and installed by the human, not by an agent.
- The signed-out state is the only screen a person sees before provisioning, so its copy is part of the product's
  first impression and is written in both catalogues.
- The account sheet's existence is the one place the mobile client is a superset of the web. That is recorded here
  rather than discovered in an audit.
