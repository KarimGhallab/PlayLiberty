# Design

The design decisions PlayLiberty's clients are built on, and where each one lives. The stacks are in [ARCHITECTURE.md](ARCHITECTURE.md); the vocabulary is in [GLOSSARY.md](GLOSSARY.md).

This file names roles and rules and never a literal value. The literals live in one place, `packages/tokens/src/values.ts`, and the clients read them: a hex or a pixel copied here would be a second copy that drifts from the first. Change a value in `values.ts`, rebuild, and every client follows.

## Where the values live

| Piece                                  | Owns                                                                                                                                                                                                                                                                                                                        |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/tokens/src/values.ts`        | Every literal: the colour roles, the type scale, the space scale, the radii, the control sizes, the durations, the weights, the leadings, the z tiers, the family and the one curve. Lengths and durations are unitless there; `emitTokens` is the only place a unit is added, and it quotes the family for the stylesheet. |
| `packages/tokens` build output         | `dist/tokens.css` for the web client's custom properties, the typed module for the mobile client's `StyleSheet`, and the morph table both clients draw with.                                                                                                                                                                |
| `packages/ui-foundation`               | The derivations both clients share, so neither writes them twice: the file-status to tone mapping and its precedence, the sleeve index a playlist draws, the equalizer's resting scales, the easing.                                                                                                                        |
| `apps/web/src/shared/styles/base.scss` | The one global stylesheet: the `@font-face`, `color-scheme`, the page ground and text, the focus ring, and the single reduced-motion rule.                                                                                                                                                                                  |

## Colour

Three grounds, one text pair, one accent, a shared role, and two families of state:

- **Grounds.** The page ground, a panel on it, and a panel raised above that. Depth is a change of ground, not a shadow: the page is dark, so a dark shadow over it is invisible rather than subtle. A boundary somebody acts through is drawn with the control border, and a rule between rows is drawn with the line.
- **Text.** Ink for what is read, muted for what qualifies it. Ink is never placed on the accent; where ink must sit on an accent ground, a surface ring separates them.
- **Accent.** One green, with one hover. It means "this is the action". The playlist detail's play and the player bar's transport keep the fill. The gallery's per-item play is quiet at rest and takes the fill on hover, focus or when its playlist is playing, so the library's accent marks the add and the playing queue rather than every tile. The detail keeps its other accent uses by decision: the switch's on position, the selected chip, the sort's open rule, the seeker and, where a pointer is the input, the volume fill. The current track in the list takes the accent at a quiet ground, with its playback word and the artwork bars, so the playing row is found while scrolling without taking the primary's fill. Its labelled add takes the control border, so in that arrangement the play is the screen's one filled primary; on a phone the floating add keeps the fill in its place. Selection elsewhere uses weight, a rule or a border rather than the accent.
- **Shared.** A sky names the owner line, the share level in force, and the gallery's shared scope, with a quiet shade on the shared and collaborator marks. It marks a relationship rather than an action: the accent still owns the primary button, and a level is still read from its word. Its surface and boundary are shades of the same hue, so the scope's selected ground never borrows a state tone.
- **Track states.** Five file-status tones plus one for a removed source, mapped by `ui-foundation/tones`. A removed source takes the removed tone whatever the file status is, because the news is that the source is gone. No state is ever carried by colour alone: every state has a word, and a failure also carries the server's own reason.
- **Covers and sleeves.** The cover chain and who may set it are owned by [GLOSSARY.md](GLOSSARY.md#content) and [ARCHITECTURE.md](ARCHITECTURE.md#images-are-normalised-once-on-the-server). The design rule is the final fallback: a playlist with no artwork at all draws one of six hues instead of an anonymous grey. The hue is _derived_ from the playlist id (`ui-foundation/sleeve`), never stored, so the same playlist keeps it across reloads and clients and nothing is migrated or backfilled. The six sit at one lightness and one chroma so they read as one family, and the arc deliberately skips the accent's green and the amber and red the states own, so a sleeve is never read as a state. The crop belongs to the cover dialog: its square is the stage for a new upload, with no second screen and no dark surround.

## Type

One family, IBM Plex Sans, in one variable file covering the three shipped weights in a single request. It is self-hosted: the private instance makes no third-party request to draw its own text. `packages/tokens` carries the family name alone (the fallback stack is each client's, because React Native takes a family name and cannot parse a CSS stack); the web client declares the face in `apps/web/src/shared/styles/base.scss` with `font-display: swap`, so a first visit renders in the fallback for a moment rather than rendering nothing.

The scale runs from `xs` to `2xl`, the leadings are tight, normal and relaxed, and the weights are regular, medium and semibold. Every text-bearing control sets `font-family: inherit`, because form controls do not inherit it from the page and would otherwise draw in the browser's own face.

## Space, shape, motion

- **Space.** A 4px-based scale, used for padding, gaps and margins alike, so the vertical rhythm of a screen is the same arithmetic everywhere.
- **Shape.** Four radii: artwork, control, card, and the full pill a chip takes. A radius says what an element is, so artwork, controls and cards never share one.
- **Motion.** Three durations and exactly one curve. Motion is decoration that reports a state change; every animated thing therefore has a resting form that already says the same thing. Menus unfold from the edge they are anchored to and leave faster than they arrive, so an upward menu rises and a downward one drops.
- **Depth tiers.** Base, sticky, player, overlay. The player bar sits below an overlay so a menu or a dialog can cover it.

## Theme

Dark only, in both clients, declared by `color-scheme`, the meta tag, the web manifest and the token set. There is no light theme and no `prefers-color-scheme` branch; adding one is a token-set change and not a stylesheet change.

## Rules the design keeps

These are the decisions that cost the most to rediscover, so they are stated once here and implemented in one place each.

- **Focus is always visible.** Every control takes the same ring: the focus width in the accent, offset from its own edge. A control that removes its outline replaces it with this ring or with a border change, never with nothing.
- **A target is 44px.** `--control-touch` names the size a touch target owes; a control smaller than it grows a box that paints nothing rather than changing what it draws. The player's seeker is the reference, with the volume rail where a pointer is the input: a 4px track with a 44px target around it.
- **The keyboard contract belongs to the menu, not to the screen.** `useDismissibleMenu` owns dismissal and navigation for every overflow and dropdown: the trigger's arrows open onto the last or the first item, the menu walks with the arrows, jumps with Home and End, leaves on Tab, closes on a press outside without moving focus, and returns focus to the trigger on Escape. A widget that declares `role="menu"` or `role="listbox"` is declaring that contract.
- **Reduced motion has one owner.** The global rule in `base.scss` removes every animation and transition, so no component restates it. A component adds a `prefers-reduced-motion` block only to contribute a still alternative for motion that carried meaning: the three spinners keep a full ring at reduced opacity, the undo ring keeps its colour, and the equalizer bars rest at their computed scales.
- **Contrast.** Text clears 4.5:1 in every pair the app draws and a boundary somebody acts through clears 3:1; as measured on 2026-10-16 the floors were `--tone-unavailable` on `--surface-raised` at 4.53:1 and `--control-border` on `--surface-raised` at 3.42:1. A new tone is checked against every ground it can land on.
- **A dialog scrolls its content, not itself.** The dialog shell is bounded by the viewport with one scroll region between its heading and its action row, so a dialog whose body grows with the account (the playlist picker) keeps its own field and its own Add on screen.
- **Images that repeat lazy-load.** A screen that draws one cover per item sets `loading="lazy"`; only an image that is the subject of its own screen loads eagerly.

## The settled arrangements

The shapes are decisions, and the screens implement them:

- **The library is a gallery.** A grid of playlists, not a list of tracks: a tile on the web and a card on a phone, both drawing the cover above the identity, in as many columns as the width holds. Pinned playlists come first under their own heading; a playlist whose first sync is still running follows under a Syncing heading, because it is still named by its source id and would otherwise land wherever that id sorts; the rest follows with no heading. A rule separates adjacent groups, so an account with nothing pinned and nothing syncing sees the one list it has always seen. A gallery holding a playlist shared with the account puts an ownership scope at the head of its filter rail, All then Shared with me with a count of playlists each, and the status counts read over that scope; the pair is absent when nothing is shared, its label and glyph take the shared hue only while that scope is in force, and while it is drawn the status All names tracks so the two Alls never count different things. The add control is a labelled button in the header on the web and the floating round action on a phone, never both; an empty gallery offers its own labelled button instead. The bulk sync states its count on the web and drops it on a phone, where the header's row cannot hold the sentence; the phone names the button with the words it shows.
- **The playlist detail is the head and the list.** Two columns on the web, with the identity column pinned beside the scrolling track list; one column on a phone, with the header sticky over it. The control block above the list is the sort on its own line, then the filter chips: the chips take the full width and wrap rather than clip. A chip wider than the rail still scrolls, and the edge fade marks the hidden edge.
- **The player bar is the only persistent chrome.** It appears with the first track and stays across routes, because music keeps playing while the listener browses. It rises from the bottom edge when that first track starts. It is absent at rest rather than drawn empty, and both pages pay its height as bottom padding because it is an overlay.
- **The playlist header is three arrangements, not one style.** The row sets the cover beside the identity with the actions in a column at its end; the card sets the cover above the identity with the actions on its scrim; the tile sets the cover above the identity with the mark and the controls in a row beneath it. They are different markup with different prop surfaces, chosen by the view and never by CSS, because the cover's position relative to the identity is not something a stylesheet can turn inside out. The row is the detail header on a phone, the card is the detail's hero on the web and a gallery item on a phone, and the tile is a gallery item on the web. On the detail, the state line carries a named sync control on its own bordered surface, so the recurring action is one press from the health it changes and the cover behind it cannot swallow it; the empty state and the failed band keep their own start, and a gallery item keeps Sync now in its menu. A phone trims the way home to Back and the playlist's sync to Sync, so that row holds one line.
- **The two widths are 1056 and 390.** The content column is 1056, the phone frame is 390, and the single breakpoint between them is the first width at which a 320px identity column beside a track list still leaves the list a usable title column. It is stated once in `useMediaQuery` and mirrored in each stylesheet that branches on it, because a custom property cannot carry a media query.
- **A track row is one target.** The whole row plays; the lane at its end is the row's own control and sits above that layer. A row that cannot be played has no play layer but keeps its lane, because a failed download has something to be done about.

## The mobile client

The app is the phone frame the web client already draws at 390, at whatever width the device has. It has one column
at every width: the web's content column and its breakpoint are the browser's and do not exist here. The token set,
the type family, the space scale, the radii, the durations and the one curve are the same values.

- **Four routes and one sheet.** The library is the root, the playlist detail is pushed, a bare track and the egress
  console are routes of their own, and the account sheet is a modal over whatever is open. There is no tab bar, no
  drawer and no sidebar; the platform's back gesture is the way back.
- **The gallery is a two-column card grid.** The card is the detail's hero arrangement: cover above the identity,
  with the play and overflow controls on the scrim. The pinned section is a heading above one horizontal row that
  peeks the next card and scrolls sideways; the rest is the grid, and the ownership scope and the status chips are
  one row that scrolls. The bulk sync keeps its count in the header; the web's phone arrangement drops it because
  the browser's header cannot hold the sentence, and the app's header can.
- **The detail is one column.** The cover, the name and the sync line lead; the sort and the chips follow on one
  rail below the header, with a vertical rule between the sort and the chips, and the rail scrolls sideways past the
  width. The transport is the player bar's, not the header's, and the header keeps Play and Shuffle.
- **The player bar is the only persistent chrome and the only transport.** The queue is a sheet above it. There is no
  volume rail, no mute and no keyboard chord: the device's buttons are the volume, and the operating system's
  controls are the transport when the app is in the background.
- **The sign-in door is the app's signed-out surface.** Three sleeves fan above the wordmark, the title and the
  browser handoff, with one filled accent action at the bottom of the column. The front sleeve carries the equalizer
  mark, still at its resting scales and moving while provisioning is in flight; the callback's return and the
  cold-start session read draw the same frame, so the handoff never shows a second screen. A failure sits above the
  action as a panel that names the problem. The covers are art rather than derived hues, because a signed-out app
  has no playlists to draw a sleeve from.
- **The account sheet is the account's settings surface.** It holds the display name, the admin mark, the language
  control and Sign out. The selected language takes the accent on its segment, as the detail's selected chip does;
  a missing avatar falls back to the account's initial on one of the six sleeve hues, derived from the account id,
  so two accounts are told apart at a glance. The admin's VPN settings door is not here: it is an instance-level
  control and sits in the library header beside the account door. The sheet dismisses on the backdrop, the system back
  gesture, or a downward drag on its handle.
- **A target is 44 points, and every control has a name and a role.** Dynamic Type is respected, with a capped
  multiplier only where a fixed layout would break, and reduced motion is read from the system. The focus ring and
  the keyboard contract are the web's and have no analogue.
- **A web-only affordance is either drawn or dropped, never ported.** A hover tip becomes a word in the row, the
  volume rail becomes the device's buttons, a keyboard chord becomes a bar control, the document title becomes the
  screen's heading, and the breakpoint becomes nothing.

## Where a change goes

| Changing                                               | Change it in                                                              |
| ------------------------------------------------------ | ------------------------------------------------------------------------- |
| A colour, a size, a duration, a weight, the family     | `packages/tokens/src/values.ts`, then rebuild                             |
| What a file status looks like                          | `packages/ui-foundation/src/tones`                                        |
| Which sleeve a playlist draws                          | `packages/ui-foundation/src/sleeve`                                       |
| How a menu opens, closes or moves focus                | `apps/web/src/shared/components/useDismissibleMenu`                       |
| The breakpoint                                         | `apps/web/src/shared/useMediaQuery` and the stylesheets that branch on it |
| The focus ring, the reduced-motion rule, the font face | `apps/web/src/shared/styles/base.scss`                                    |
| A screen's layout or copy                              | That screen's view module and its stylesheet                              |
| A mobile screen's layout or copy                       | That screen's module under `apps/mobile/src`, and its sheet               |
| The mobile routes                                      | `apps/mobile/app`                                                         |
| The mobile style helpers over the tokens               | The app's shared style module under `apps/mobile/src`                     |
