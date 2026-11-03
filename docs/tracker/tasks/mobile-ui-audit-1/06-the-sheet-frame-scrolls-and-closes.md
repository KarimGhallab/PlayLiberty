# 06: The sheet frame scrolls and closes

**Status:** resolved
**Labels:** `bug`, `ready-for-agent`
**Source:** [The mobile app's UI misses its contract](../../issues/105-the-mobile-apps-ui-misses-its-contract.md)
**Blocked by:** None. Can start immediately.

## Observed

The sheet frame caps itself at 90% of the window but gives its body no scroll region. The playlist actions sheet stacks
a summary, up to six 44pt rows and the skip switch directly in that body. At font scale 2 on a 640dp phone it needs
about 616pt against a 576pt cap, so rows draw past the rounded top edge and the delete and skip controls can land
off-screen or under the scrim. `docs/DESIGN.md` states the opposite rule: a dialog scrolls its content, not itself.

The frame's backdrop is also removed from the accessibility tree, and its handle carries no role or label. Four sheets
(account, playlist actions, track actions, sort) have no Close, so on iOS the only non-gesture way out is the escape
gesture.

## Expected

A sheet's body scrolls between its heading and its footer, and the footer stays on screen. Every sheet has a labelled
dismiss that assistive tech can reach, in addition to the backdrop and the system back.

## Evidence

- `apps/mobile/src/shared/components/Sheet/Sheet.tsx`: `styles.sheet` with `maxHeight: '90%'` and no scroll child; the
  backdrop's `accessible={false}` and `importantForAccessibility="no"`.
- `apps/mobile/src/views/library/PlaylistActionsSheet/PlaylistActionsSheet.tsx`: summary, rows and switch in the body.

## Acceptance criteria

- [ ] The actions sheet with six actions and the skip switch, at font scale 2, scrolls its body and keeps its footer
      reachable.
- [ ] The sheet frame owns one scroll region, so a sheet cannot reintroduce the overflow.
- [ ] Every sheet exposes a labelled dismiss to TalkBack and VoiceOver.
- [ ] Android's hardware back still closes the sheet, and the backdrop still dismisses it.

## Outcome

The sheet frame now owns one body scroll between the heading and the footer. `Sheet` wraps its children in a
`ScrollView` that shrinks inside the 90% cap, takes an optional `footer` that stays fixed, and puts a labelled Close
beside the title; the backdrop and the hardware back still close it. The sheets with a clean action row pass it as the
footer (add track, add playlist, rename, share, share account picker); the actions, track actions, account and sort
sheets scroll their whole body, which is where their content lives. The cover sheet keeps its conditional actions in
the body because they interleave with its confirm prompts; they scroll rather than pin.

`common.close` is in both catalogs. The frame's suite asserts the Close, the body scroll and the backdrop; the sheet
suites still pass. On the emulator at font scale 2, the playlist actions sheet showed the Close, the sync summary, the
cover and sync rows and the skip switch, with the body as the scroll region.

## Verification

`pnpm --filter @playliberty/mobile run test`, `pnpm --filter @playliberty/mobile run typecheck`, `pnpm run lint:check`
and `pnpm run build` pass. The Maestro sheet flows pass, and the actions sheet at font scale 2 shows every row and the
footer.
