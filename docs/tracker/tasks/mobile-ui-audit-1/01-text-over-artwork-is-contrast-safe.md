# 01: Text over artwork is contrast-safe

**Status:** ready-for-agent
**Labels:** `bug`, `ready-for-agent`
**Source:** [The mobile app's UI misses its contract](../../issues/105-the-mobile-apps-ui-misses-its-contract.md)
**Blocked by:** None. Can start immediately.

## Observed

The player bar draws its playlist name in `muted` and its queue count in `accent` over the cover at 45% opacity, then
a `bg` scrim at 50% over both. Against a white cover that composite is `rgb(65,82,83)`: the name measures **2.61:1**
and the count **2.47:1**. An average grey cover still gives 4.06:1 and 3.85:1.

The detail header's failed-state word draws over its 12% cover backdrop. Against a white cover that ground is
`rgb(40,42,45)` and `tone-failed` measures **4.17:1**.

## Expected

Every text pair clears 4.5:1 against the brightest possible cover. The guarantee is a property of the surface, not of
the image, so it holds for any artwork a user sets.

## Evidence

- `apps/mobile/src/player/PlayerBar/PlayerBar.tsx`: the veil image at 0.45, the veil scrim at 0.5, `styles.playlist`
  and `styles.count`.
- `apps/mobile/src/views/playlist/PlaylistIdentity/PlaylistIdentity.tsx`: `styles.backdrop` at 0.12.
- Composite ratios computed from `packages/tokens/src/values.ts`.

## Acceptance criteria

- [ ] The player bar's playlist name and queue count sit on an opaque token ground, or on a scrim proven at the
      brightest cover, and clear 4.5:1.
- [ ] The detail header's failed-state word clears 4.5:1 on its backdrop, or the backdrop stops sitting under text.
- [ ] The two pairs are asserted in the mobile token test so a later colour change fails the suite.
- [ ] A white cover, a mid-grey cover and a sleeve fallback all read correctly on the emulator.

## Verification

`pnpm --filter @playliberty/mobile run test`, `pnpm --filter @playliberty/mobile run typecheck`, `pnpm run lint:check`
and `pnpm run build` pass. The token test fails if either ratio drops below 4.5. The emulator shows a white-cover
playlist with a readable bar and a readable failed state.
