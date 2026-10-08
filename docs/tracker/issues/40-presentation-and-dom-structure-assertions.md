# 40: Presentation and DOM-structure assertions

**State:** `resolved`
**Category:** `enhancement`

**Blocked by:** None. Can start immediately.

## Agent Brief

**Category:** enhancement
**Summary:** The web suite asserts styling and markup detail that no user behavior depends on: CSS class substrings, inline style, sibling order, presentation `data-*` markers and resource hints. Each fails on a layout change that proves nothing.

**Current behavior:**
`PlaylistHeader.test.tsx`, `TrackRow.test.tsx`, `LibraryPage.test.tsx`, `LibrarySkeleton.test.tsx`, `PlaylistDetailPage.test.tsx`, `PlayerBar.test.tsx`, `PlayerAudio.test.tsx` and `router.test.tsx` carry assertions on class substrings (`[class*="scrim"]`), inline style (`style.backgroundImage`, `style.transform`), sibling order (`previousElementSibling`, `lastElementChild`, `indexOf`), presentation `data-*` (`data-arrangement`, `data-art`, `data-ground`, `data-sleeve`, `data-playable`, `data-downloading`, `data-pending`, `data-state`, `data-tip-dismissed`) and resource hints (`loading`, `decoding`).

**Desired behavior:**
The assertions listed under Cut are removed. Where the behavior behind one is owned elsewhere, the owner test stays and is named. The replace candidates are resolved. `aria-*` that pin an accessible state, contract copy (problem sentences), and the security header tests stay.

**Acceptance criteria:**

- [x] The Cut assertions are removed, and nothing else.
- [x] Every cut whose behavior is owned elsewhere keeps its named owner test.
- [x] Each replace candidate is added or explicitly dropped.
- [x] The web suite passes.
- [x] `pnpm run build` and `pnpm run lint` pass.

**Out of scope:**

- The server, package and e2e suites; those are issues 41, 42 and 45.
- Multi-layer redundancy; that is issue 44.

## Manifest

### Cut

`drop test` means the whole `it` exists only for the presentation fact; `drop assertion` means the `it` has behavior assertions that stay.

| File:line                             | Test                                                                  | Asserted                                                   | Drop      | Owner / note                                    |
| ------------------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------- | --------- | ----------------------------------------------- |
| `PlaylistHeader.test.tsx:183-184`     | marks the detail header so the narrow row can give the name its width | `[data-arrangement]`, `data-heading`                       | test      | none: layout hook                               |
| `PlaylistHeader.test.tsx:189-194`     | same                                                                  | `[class*="__body"/"__actions"]`, sibling order             | test      | none: layout structure                          |
| `PlaylistHeader.test.tsx:202-204`     | leaves the library item unmarked                                      | `data-arrangement`/`data-heading` absent                   | test      | none: layout hook                               |
| `PlaylistHeader.test.tsx:214`         | carries the full name                                                 | `title` attribute                                          | assertion | name render at `:116`                           |
| `PlaylistHeader.test.tsx:224`         | carries the full name on the heading                                  | `title` attribute                                          | assertion | name render at `:154`                           |
| `PlaylistHeader.test.tsx:296-300`     | gives a no-artwork cover its derived sleeve                           | `[data-sleeve]` index                                      | assertion | `sleeve.test.ts`                                |
| `PlaylistHeader.test.tsx:309`         | draws the cover from the first track thumbnail                        | `[data-art="art"]`                                         | assertion | cover URL contract at `:310` stays              |
| `PlaylistHeader.test.tsx:327-328`     | defers the row cover and async-decodes it                             | `loading`, `decoding`                                      | test      | none: resource hint                             |
| `PlaylistHeader.test.tsx:338-339`     | loads the card cover eagerly                                          | `loading`, `decoding`                                      | test      | none: resource hint                             |
| `PlaylistHeader.test.tsx:353-354`     | falls back to the sleeve when the cover fails                         | `[data-art="no-art"]`, `[data-sleeve]`                     | assertion | none: fallback markup                           |
| `PlaylistHeader.test.tsx:367-375`     | draws the cover as a blurred ground behind the row                    | `[data-ground="art"]`, `style.backgroundImage`             | test      | none: inline style                              |
| `PlaylistHeader.test.tsx:383-385`     | gives the ground the sleeve hue                                       | `[data-ground="sleeve"]`, `data-sleeve`                    | test      | none: markup/style hook                         |
| `PlaylistHeader.test.tsx:403-411`     | draws the cover as a ground behind the card                           | `data-arrangement`, `data-ground`, `style.backgroundImage` | test      | none: inline style                              |
| `PlaylistHeader.test.tsx:440`         | marks the sync state on the item                                      | `data-state="error"`                                       | assertion | failed state at `:285`/`:438`                   |
| `PlaylistHeader.test.tsx:562-568`     | sits the shuffle immediately left of the overflow                     | sibling order                                              | test      | none: sibling order                             |
| `PlaylistHeader.test.tsx:620`         | marks a pending row                                                   | `data-pending`                                             | assertion | disabled controls `:622-632`, `aria-busy` stays |
| `PlaylistHeader.test.tsx:687`         | keeps the share tooltip decorative                                    | tip text                                                   | assertion | mark `aria-label` at `:231`/`:238`              |
| `TrackRow.test.tsx:85`                | marks a pending row and disables its lane and play                    | `data-pending`                                             | assertion | disabled controls `:87-92`, `aria-busy` stays   |
| `TrackRow.test.tsx:100-110`           | defers and async-decodes the artwork                                  | `loading`, `decoding`                                      | test      | none: resource hint                             |
| `TrackRow.test.tsx:296`               | marks a downloading track                                             | `data-downloading`                                         | assertion | none: animation hook                            |
| `TrackRow.test.tsx:304-306`           | does not mark a stored track as downloading                           | `data-downloading` absent                                  | test      | none: styling hook                              |
| `TrackRow.test.tsx:342-345`           | shows the mapped word and holds the raw reason                        | `title` attribute                                          | assertion | Failed label at `:336`                          |
| `TrackRow.test.tsx:366-369`           | keeps the removed title at full ink                                   | `data-playable`                                            | assertion | none: ink-tier hook                             |
| `TrackRow.test.tsx:378-381`           | steps an unplayable row down                                          | `data-playable`/`data-downloading`                         | assertion | none: styling hook                              |
| `TrackRow.test.tsx:389-392`           | leaves a downloading row alone                                        | `data-downloading`                                         | assertion | none: styling hook                              |
| `TrackRow.test.tsx:421`               | darkens the current track whether playing or paused                   | `[class*="scrim"]`                                         | test      | none: CSS class                                 |
| `TrackRow.test.tsx:428`               | keeps the darkening when paused                                       | `[class*="scrim"]`                                         | test      | none: CSS class                                 |
| `TrackRow.test.tsx:435`               | leaves a non-current track undarkened                                 | `[class*="scrim"]` absent                                  | test      | none: CSS class                                 |
| `TrackRow.test.tsx:442-445`           | marks the current track with its playback state                       | `data-state="playing"`                                     | assertion | equalizer at `:395`/`:404`                      |
| `LibrarySkeleton.test.tsx:23-25`      | announces loading once and keeps the shapes out of the tree           | `[aria-hidden="true"] > *` count                           | assertion | none: tuned shape count                         |
| `LibraryPage.test.tsx:301`            | reserves the shape of the list while the read is pending              | `[aria-hidden="true"] > *` count                           | test      | none: tuned shape count                         |
| `LibraryPage.test.tsx:322-325`        | orders the items as the route returned them                           | item text order                                            | test      | none: server-order pass-through                 |
| `LibraryPage.test.tsx:893-894`        | marks a playlist pending while its delete waits                       | `[data-arrangement]`, `data-pending`                       | assertion | disabled controls `:896-903`, `aria-busy` stays |
| `LibraryPage.test.tsx:907`            | lifts it on Cancel                                                    | `data-pending` absent                                      | assertion | enabled controls `:909-910`                     |
| `PlaylistDetailPage.test.tsx:520`     | marks a track pending while its removal waits                         | `li[data-pending]` absent                                  | assertion | enabled play `:522-523`, `aria-busy` stays      |
| `PlaylistDetailPage.test.tsx:540-541` | marks the header pending while its delete waits                       | `[data-arrangement]`, `data-pending`                       | assertion | disabled shuffle `:543-545`, `aria-busy` stays  |
| `PlaylistDetailPage.test.tsx:565-566` | marks the track rows pending                                          | `li[data-pending]` count                                   | assertion | disabled play `:568-569`                        |
| `PlayerAudio.test.tsx:81`             | plays exactly one track at a time                                     | `querySelectorAll('audio')` count                          | assertion | active src at `:80`                             |
| `PlayerBar.test.tsx:200-203`          | moves the fill with a composited transform                            | `firstElementChild`, `style.transform`, `style.width`      | test      | position state via `aria-valuenow` at `:184`    |

### Keep (reviewed, no change)

`aria-*` and role that pin an accessible state a user relies on (`aria-pressed` on shuffle, `aria-checked` on the skip switch, `aria-busy`/`aria-disabled` on pending, `role="img"` names for share and playback state, `aria-valuenow` on the seeker), the stream route `src`, the security header tests, and the user-facing problem sentences. Two borderline copy calls are open questions below.

### Replace candidates

| File:line                                         | Test                                                                          | What cutting loses                                                                      | Replacement                                                    |
| ------------------------------------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `PlaylistDetailPage.test.tsx:892-894`             | draws the summary of the latest run                                           | `SyncSummary` has no test file, so the four-figure and tone branch loses its only owner | add a `SyncSummary` unit test                                  |
| `router.test.tsx:81,93`                           | keeps the bar and the audio element mounted across a route change             | playback surviving navigation loses its owner                                           | replace with a playback assertion (`play`/position persists)   |
| `PlaylistDetailPage.test.tsx:184-189`, `:200-205` | draws the header as card at web width and row at phone width                  | the viewport to arrangement branch is only observed through a presentation attribute    | replace with a user-visible difference, or drop if layout-only |
| `PlaylistHeader.test.tsx:658-677`                 | dismisses the share tooltip on Escape and reveals it when the pointer returns | WCAG 1.4.13 dismissal has no accessible observable beyond `data-tip-dismissed`          | replace only if an observable can be introduced, else drop     |

## Observed

- The Cut table above, catalogued from the web suite on 2026-10-08.

## Expected

The Cut assertions are gone; the owner tests named above stay; the replace candidates are resolved.

## Outcome

Done. The presentation and DOM-structure assertions are gone; behavior keeps its owner.

- Removed 16 test blocks and the individual assertions listed in the manifest, across `PlaylistHeader.test.tsx`, `TrackRow.test.tsx`, `LibrarySkeleton.test.tsx`, `LibraryPage.test.tsx`, `PlaylistDetailPage.test.tsx`, `PlayerAudio.test.tsx` and `PlayerBar.test.tsx`. Every cut that had a surviving owner names it in the manifest, and those owner tests stayed.
- Kept after review, both answering to no accessible observable: the `data-arrangement` assertions on the detail header (the responsive switch, guarding the ticket 11 phone-header fix) and the share-tooltip `data-tip-dismissed` assertions (WCAG 1.4.13 dismissal).
- Replaced: added `SyncSummary.test.tsx` for the four figures and the downloading line, and reduced the detail-page summary test to one presence assertion; changed the router test from `querySelector('audio')` to a playback assertion (`play` called once across navigation, so the source is not restarted).

Verification: the web suite passes (40 files, 396 tests; 410 before, minus 16 blocks and the issue 43 duplicate, plus 3 `SyncSummary` tests). `pnpm run build` and `pnpm run lint` are clean.

## Evidence

- Test pruning review 2026-10-08 (issue 40 manifest, explore pass over `apps/web/src`).
