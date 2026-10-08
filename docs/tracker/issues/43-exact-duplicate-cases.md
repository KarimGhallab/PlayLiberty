# 43: Exact duplicate cases

**State:** `resolved`
**Category:** `enhancement`

**Blocked by:** None. Can start immediately.

## Agent Brief

**Category:** enhancement
**Summary:** One test case is duplicated byte for byte, title and body.

**Current behavior:**
`PlaylistDetailPage.test.tsx:609` and `:686` are both `it('names the playlist from the playlist read')`, each rendering the detail and asserting the heading `Rain On The Window`. The two bodies are identical: same `renderDetail()`, same default handlers, same assertion. The copy adds no input, branch or behavior.

**Desired behavior:**
The duplicate at `:686` is removed; `:609` remains as the owner.

**Acceptance criteria:**

- [x] `PlaylistDetailPage.test.tsx:686` is removed and `:609` remains.
- [x] The web suite passes.
- [x] `pnpm run build` and `pnpm run lint` pass.

**Out of scope:**

- Near-duplicates that exercise a different input, action or branch; those are boundary coverage and stay (this includes `playerStore.test.ts:327`/`:335`, `PlayerAudio.test.tsx:70`/`:84`, `VolumeControl.test.tsx:123`/`:132` and the `TrackRow` scrim cluster).

## Manifest

| File:line                         | Test                                      | Asserted                                            | Action    | Owner                  |
| --------------------------------- | ----------------------------------------- | --------------------------------------------------- | --------- | ---------------------- |
| `PlaylistDetailPage.test.tsx:686` | names the playlist from the playlist read | heading `Rain On The Window` after `renderDetail()` | drop test | `:609`, byte-identical |

## Observed

- `PlaylistDetailPage.test.tsx:609-615` and `:686-692` are identical.

## Expected

One owner for the behavior; the copy is gone.

## Outcome

Done. The duplicate at `PlaylistDetailPage.test.tsx:686` is removed; `:609` remains as the owner. The near-duplicates the scan flagged (`playerStore.test.ts:327`/`:335`, `PlayerAudio.test.tsx:70`/`:84`, `VolumeControl.test.tsx:123`/`:132`, the `TrackRow` scrim cluster) each exercise a different input or action and stay as boundary coverage.

Verification: the web suite passes (40 files, 396 tests). `pnpm run build` and `pnpm run lint` are clean.

## Evidence

- Test pruning review 2026-10-08 (issue 43 manifest, explore pass over all 81 test files; one exact duplicate found).
