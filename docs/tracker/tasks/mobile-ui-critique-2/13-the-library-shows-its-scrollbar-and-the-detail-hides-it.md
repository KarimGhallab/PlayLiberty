# 13: The library shows its scrollbar and the detail hides it

**Status:** resolved
**Labels:** `bug`, `ready-for-agent`
**Source:** [A second design critique scores the mobile app 26/40](../../issues/123-a-second-design-critique-scores-the-mobile-app-26-40.md)
**Blocked by:** None. Can start immediately.

## Observed

The gallery draws the Android vertical scrollbar over the cards; the track list explicitly hides it. The two lists are
the same object with the same role, so the chrome changes with the route.

## Expected

One rule for both lists. Either the scrollbar is hidden on both, as the detail already does, or it is shown on both.

## Evidence

- `apps/mobile/src/views/library/PlaylistGallery/PlaylistGallery.tsx:867-898`: no `showsVerticalScrollIndicator`.
- `apps/mobile/src/views/playlist/PlaylistDetail/PlaylistDetail.tsx:1394`: the indicator is disabled.
- Screenshots `a-lib-scrolled.png` against `a-bare-track.png`.

## Acceptance criteria

- [x] Both lists follow one rule.
- [x] The rule is stated where the list component is owned, not per screen.
- [x] A test asserts the shared list's indicator behaviour.

## Verification

Scroll both routes on the emulator and compare. Then `pnpm --filter @playliberty/mobile test`.

## Outcome

Implemented on 2026-11-06. The rule is hidden on both, and it lives in one module.

`apps/mobile/src/shared/components/List/listChrome.ts` exports `verticalListChrome`, the prop set every vertical list
spreads. The gallery and the detail both use it, so neither screen states the indicator itself and a third list inherits
the same chrome by construction. `listChrome.test.ts` pins the value.

Verified on the emulator at 1.0: the gallery scrolled with no scrollbar at the right edge
(`/tmp/opencode/t13/lib-scrolled.png`), and the detail scrolled the same way (`detail-scrolled.png`).

Checks: mobile typecheck and suite pass. The root build, lint and unit run follows in the batch for this session.
