# 18: Covers request no decode size

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Source:** [A second design critique scores the mobile app 26/40](../../issues/123-a-second-design-critique-scores-the-mobile-app-26-40.md)
**Blocked by:** None. Can start immediately.

## Observed

Thirteen `<Image>` sites request no width or height, so the decoder chooses a size and the row thumbnails and the
player-bar artwork decode at whatever the server serves. Three swipes over a 78-row list produced 26 HWUI decode
warnings. No dropped frames were logged, so this is decode volume, not proven jank, but the rows are 56dp and the
images are not.

## Expected

Each image decodes at or near the size it is drawn, through one pipeline, as the cover chain already does on the web.

## Evidence

- `apps/mobile/src/views/playlist/TrackRow/TrackRow.tsx:158`, `views/library/PlaylistCard/PlaylistCard.tsx:203`,
  `views/playlist/PlaylistIdentity/PlaylistIdentity.tsx:543,567`, `player/PlayerBar/PlayerBar.tsx:450`, `Artwork.tsx:40`,
  `views/library/CoverSheet/CoverSheet.tsx:502,511,529`, `shared/components/AccountAvatar/AccountAvatar.tsx:35`,
  `shared/components/SignInDoor/ShelfSleeves.tsx:28,36,44`.
- `adb logcat` during a scroll, 2026-11-05: 26 `HWUI: Image decoding logging dropped!`, zero skipped frames.

## Acceptance criteria

- [x] Row thumbnails, cards, the bar and avatars decode at their drawn size.
- [x] One module owns the request shape, so a new image site cannot skip it.
- [ ] The decode warning count over the same scroll drops.
- [x] Full-size artwork still opens from the cover dialog and the bare track route.

## Verification

Repeat the three-swipe logcat capture on a 78-row list and compare the warning count, then confirm the large views still
render. Then `pnpm --filter @playliberty/mobile test`.

## Outcome

Implemented on 2026-11-06. One component owns how an image is decoded.

`apps/mobile/src/shared/components/AppImage/AppImage.tsx` wraps React Native's `Image` and sets
`resizeMethod="resize"`, which makes Android resize to the view's drawn bounds before the decode. A `natural` prop
drops that for a caller that needs the source's own pixels. Every one of the thirteen image sites now uses it: the
track row, the playlist card, the identity's cover and backdrop, the player bar's artwork and veil, the account avatar,
the three shelf sleeves, and the cover dialog. The dialog's chosen-image previews pass `natural`, so cropping and
zooming still work from the full-resolution file; the rest decode at their drawn size. A new site that imports a raw
`Image` is the only way to skip the rule, and the grep over `apps/mobile/src` now finds the primitive only inside
`AppImage`.

The HWUI message in the evidence (`Image decoding logging dropped!`) is the logger dropping its own records, not a
decode count, so the numeric drop was not claimed from it. The decode target is now the view's bounds by
construction, and the tests pin that: `AppImage.test.tsx` covers the default and `natural`, the track row asserts its
image opts in, and the cover dialog asserts its preview opts out.

Checks: mobile typecheck and suite pass. The root build, lint and unit run follows in the batch for this session.
