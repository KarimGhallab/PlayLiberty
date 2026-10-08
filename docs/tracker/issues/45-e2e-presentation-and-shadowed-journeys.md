# 45: e2e presentation and fully-shadowed journeys

**State:** `resolved`
**Category:** `enhancement`

**Blocked by:** None. Can start immediately.

## Agent Brief

**Category:** enhancement
**Summary:** The e2e specs carry presentation assertions owned by component tests, and two journeys are fully shadowed with no assembly claim of their own.

**Current behavior:**
`sync.spec.ts` asserts the failure band's exact sentences, `share.spec.ts` asserts the header indicator images, and `curate.spec.ts` asserts a dialog checkbox preselection. `library.spec.ts` and `curate.spec.ts` each carry one journey already owned at the component layer with a real router. The shuffle specs identify the sounding row through `ul li[data-state="playing"]`, a presentation selector.

**Desired behavior:**
The two fully-shadowed journeys are removed; the presentation assertions owned by component tests are removed; the shuffle journey keeps its claim but observes the sounding row through the accessible playing state rather than the `data-*` presentation hook. Every journey that proves a real boundary stays.

**Acceptance criteria:**

- [x] The two fully-shadowed journeys are removed.
- [x] The presentation assertions in the Trim table are removed.
- [x] The shuffle specs observe the sounding row through the accessible playing state.
- [x] The e2e suite passes.
- [x] `pnpm run build` and `pnpm run lint` pass.

**Out of scope:**

- Consolidating the duplicated setup helpers.
- The unit suites; those are issues 40 to 44.

## Manifest

### Cut whole journeys

| File:line            | Journey                                                      | Owner                                                         |
| -------------------- | ------------------------------------------------------------ | ------------------------------------------------------------- |
| `library.spec.ts:13` | the empty gallery offers to add a playlist, and nothing else | `EmptyGallery.test.tsx:18-25`, `LibraryPage.test.tsx:466-480` |
| `curate.spec.ts:109` | a press on the item itself opens the playlist                | `LibraryPage.test.tsx:325-334` (real router)                  |

### Trim assertions

| File:line              | Assertion                                                      | Owner                             |
| ---------------------- | -------------------------------------------------------------- | --------------------------------- |
| `sync.spec.ts:100-104` | `Could not reach YouTube, the playlist may not be up to date.` | `SyncError.test.tsx:32-36`        |
| `sync.spec.ts:105-107` | the `still here and will never be deleted` reassurance         | `SyncError.test.tsx:38-68`        |
| `sync.spec.ts:108`     | the `Sync now` button presence                                 | `SyncError.test.tsx:70-82`        |
| `library.spec.ts:54`   | the `3` track count                                            | `PlaylistHeader.test.tsx:116-124` |
| `sync.spec.ts:45`      | the `2` track count                                            | `PlaylistHeader.test.tsx:116-124` |
| `live.spec.ts:63`      | the `Up to date` sync state                                    | `PlaylistHeader.test.tsx:116-125` |
| `curate.spec.ts:207`   | the add dialog checkbox preselection                           | `AddTrackDialog.test.tsx:64-77`   |
| `share.spec.ts:65-67`  | the `Shared playlist` indicator before the reload              | `PlaylistHeader.test.tsx:188-194` |
| `share.spec.ts:87-89`  | the `Private playlist` indicator after revoke                  | `PlaylistHeader.test.tsx:180-186` |

### Replace selectors (keep the claim)

| File:line                                                            | Current                                  | Replace with                                                                              |
| -------------------------------------------------------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------- |
| `shuffle.spec.ts:54`, `:110-112`, `:138-140`, `:176-178`, `:197-199` | `ul li[data-state="playing"]` inner text | the accessible playing state (the row whose `Playing` image is named), scoped to the list |
| `shuffle.spec.ts:40`                                                 | `ul li` list scope                       | `getByRole('listitem')`                                                                   |

### Keep as assembly

Every journey that proves a boundary no lower layer can: `library.spec.ts:25`, `:57`; `curate.spec.ts:30`, `:56`, `:77`, `:93`, `:117`, `:141`, `:177`, `:225`, `:274`; `sync.spec.ts:20`, `:55`; `skip.spec.ts:82`, `:119`; `shuffle.spec.ts:103`, `:122`, `:153`, `:182`; `share.spec.ts:27`; `playback.spec.ts:20`; `live.spec.ts:32`, `:79`, `:142`, `:192`.

Also kept: the `sync.spec.ts:110-111` reveal of the server's raw reason (a real-boundary artifact), the dialog-presence waits in `curate.spec.ts`, `library.spec.ts` and `skip.spec.ts` (they synchronize the next step), and the negative `No playlists yet` baselines in `live.spec.ts:48`, `:237`.

## Observed

- The Cut, Trim and Replace tables above, catalogued from the e2e specs on 2026-10-08.

## Expected

The two shadowed journeys and the owned presentation assertions are gone; the shuffle journey keeps its claim through the accessible state; every boundary journey stays.

## Outcome

Done. The e2e suite carries journeys, not presentation.

- Cut two fully-shadowed journeys: `library.spec.ts` (empty gallery) and `curate.spec.ts` (press-opens-playlist).
- Trimmed the component-owned presentation assertions: the sync failure-band sentences and the `Sync now` presence, the two track-count texts, the `Up to date` state, the add-dialog checkbox preselection, and the post-revoke `Private playlist` indicator.
- Replaced the shuffle presentation selectors: the `playingRow` helper and `rowTitles` now use `getByRole('listitem')`, and the sounding row is the listitem filtered by the accessible `Playing` image, so the journey keeps its claim without the `data-state` coupling.
- Kept the pre-reload `Shared playlist` indicator, a deviation from the manifest: it synchronizes the grant's persistence before the reload and cutting it would race the reload. Kept the dialog-presence waits in `curate`, `library` and `skip` (they synchronize the next step), the `sync.spec.ts` raw-reason reveal (a real-server artifact), and the negative `No playlists yet` baselines in `live.spec.ts`.

Verification: the real e2e suite passes (25 journeys on chromium, 1.2m); `pnpm --filter @playliberty/e2e run typecheck`, `pnpm run build` and `pnpm run lint` are clean.

## Evidence

- Test pruning review 2026-10-08 (issue 45 manifest, explore pass over `e2e/`).
