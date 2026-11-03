# 11: The account sheet and the bare track have no loading state

**Status:** resolved
**Labels:** `bug`, `ready-for-agent`
**Source:** [A design critique scores the mobile app 26/40](../../issues/108-a-design-critique-scores-the-mobile-app-26-40.md)
**Blocked by:** None. Can start immediately.

## Observed

Both screens read one thing and draw nothing while the read is in flight:

- The account sheet drops the whole identity block when `account` is null, so the sheet opens with the language
  control and Sign out and no name, mark or avatar, then fills in.
- The bare track route returns `null` until the read lands or a notice exists, so a track link opened cold shows the
  ground and nothing else.

Every other surface in the app has all three of loading, error and empty: the gallery, the detail, the egress console,
the share sheet, the picker and the signed-out door.

## Expected

A read in flight shows a shape where its result will land, announced to assistive tech, and the surface does not
change height when the value arrives.

## Evidence

- `apps/mobile/src/shared/components/AccountSheet/AccountSheet.tsx`: the identity block is conditional on `account`.
- `apps/mobile/src/views/track/BareTrackEntry/BareTrackEntry.tsx`: the early `null` return.
- The critique's state inventory: these are the only two surfaces missing a loading state.

## Acceptance criteria

- [x] The account sheet reserves the identity block's height and fills it with a placeholder while reading.
- [x] The bare track draws its chrome with a placeholder where the track will be.
- [x] Both announce the busy state once, not per frame.
- [x] Both leave the layout unchanged when the read lands.
- [x] Tests cover the loading state of each.

## Outcome

`AccountSheet` gained a `loading` prop, fed by `useAccount(...).isPending` in `LibraryShell`. While the account read has no
value, the identity block is a 48dp row: a 48dp avatar shape and two text lines inside one accessible node labelled
"Loading the account." with a live region. The loaded row is the same 48dp tall, from the same avatar box, so the sheet
does not resize when the name arrives. A failed read still draws no identity block.

The bare track route renders `BareTrackLoading` while `useTrack` is pending and the session is signed in. It holds the
player bar's slot at the bar's resting height and inset, with an artwork square and two lines, as one accessible node
labelled "Opening the track." The placeholder is not interactive and does not block the gallery. It yields to the real
bar, or to the notice, as soon as data or an error lands. The slot is absolute, so the rest of the page does not move.

Both labels live in the shared catalogs as `account.loading` and `trackLink.loading`, so English and French ship
together.

Tests: the account sheet covers the reserved row and the no-read fallback; the bare track covers the pending slot, the
signed-out gate, and the placeholder leaving once the track lands. Mobile 605 passed, i18n 43 passed, `pnpm run build`
clean, `pnpm run lint:check` clean.
