# 01: Text over artwork is contrast-safe

**Status:** resolved
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

## Outcome

The bar keeps its cover. The veil image at 0.45 and the `bg` scrim at 0.5 are unchanged, and both strengths now live
in the mobile token adapter so the test and the bar read one value. What changed is the text: the playlist name and
the seek times take `muted-on-art`, the queue count takes `accent-on-art`, and the unfilled rail takes
`muted-on-art`. The title and the step icons stay `ink`, and the play orb stays `accent`.

The two on-art shades are new tokens, measured against the bar's worst ground: a white cover over the lightest sleeve
at the veil, then the scrim. That ground is `rgb(72,80,88)`. `muted-on-art` `#c2c7cb` measures 4.81:1 and
`accent-on-art` `#7fd9b6` 4.88:1. A prototype compared this against a single ink voice; the ink voice flattened the
hierarchy and lost the rail into the cover, so the on-art shades won.

The detail header's cover ground dropped from 0.12 to 0.07, named `coverGroundOpacity` so the test and the header read
one value. The failed word measures 4.84:1 on the brightest possible cover, the muted time 5.31:1, and the shared
owner line 5.86:1. The header still takes a faint copy of its cover as its ground.

The mobile token test now loops the six sleeves and the bare-queue ground, composites the brightest cover at the veil
and scrim, and asserts both on-art pairs; it also asserts the header's failed word. The header pair was red first at
4.17:1 before the value changed.

On the emulator, a bright-cover playlist played from its first row: the cover tint stayed behind the bar, and the
title, `Chine`, `1/67`, the times and the rail all read. No failed playlist exists in the dev data, so the failed
word's pair is covered by the token test rather than a screenshot.

## Verification

`pnpm --filter @playliberty/mobile run test`, `pnpm --filter @playliberty/mobile run typecheck`, `pnpm run lint:check`
and `pnpm run build` pass. The token test fails if either on-art pair drops below 4.5 on any sleeve or the raised
ground. The emulator shows the cover behind a readable bar.
