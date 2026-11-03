# 07: Single-choice groups announce as radios

**Status:** resolved
**Labels:** `bug`, `ready-for-agent`
**Source:** [The mobile app's UI misses its contract](../../issues/105-the-mobile-apps-ui-misses-its-contract.md)
**Blocked by:** None. Can start immediately.

## Observed

Five single-choice controls use four different role and state combinations:

- The gallery's ownership scope is a `radiogroup` whose children are `button`s with `selected`.
- The detail's filter chips are a `radiogroup` whose children are `button`s with `selected`.
- The sort sheet uses `radio` with `checked` but declares no group.
- The account sheet's language control uses `button` with `selected`.
- The share picker's level control uses `button` with `selected`.

TalkBack announces "radio group" and then non-radio buttons, or radios outside a group. The user cannot tell a
single-choice control from a set of independent toggles.

## Expected

One pattern for every single-choice set: `radiogroup` on the container and `radio` with `checked` on each option. The
visual design does not change.

## Evidence

- `apps/mobile/src/views/library/GalleryFilterBar/GalleryFilterBar.tsx`
- `apps/mobile/src/views/playlist/PlaylistControls/PlaylistControls.tsx`
- `apps/mobile/src/views/playlist/PlaylistControls/PlaylistSortSheet.tsx`
- `apps/mobile/src/shared/components/AccountSheet/AccountSheet.tsx`
- `apps/mobile/src/views/library/ShareAccountPicker/ShareAccountPicker.tsx`

## Acceptance criteria

- [ ] All five groups use `radiogroup` on the container and `radio` with `checked` on each option.
- [ ] Each option's label names its value and, where it has a count, the count.
- [ ] No option still reports `button` with `selected`.
- [ ] The component tests assert the role, the checked state and the group for each set.

## Outcome

The five single-choice sets use one pattern: a `radiogroup` on the container and `radio` with `checked` on each
option. The gallery's scope and status chips, the detail's chips, the sort sheet, the account sheet's language and the
share picker's levels all follow it; the `Chip` itself is the radio. The group labels name the set, and the chip and
scope labels keep their counts.

The suites assert the role, the group and the checked state. The emulator's accessibility tree shows the scope and the
status chips as `android.widget.RadioButton` with `checkable="true"` and the selected option `checked="true"`, carrying
`Toutes 13` and `Toutes les pistes 1385`.

## Verification

`pnpm --filter @playliberty/mobile run test`, `pnpm --filter @playliberty/mobile run typecheck`, `pnpm run lint:check`
and `pnpm run build` pass. TalkBack on the emulator announces each set as a group and each option as a radio.
