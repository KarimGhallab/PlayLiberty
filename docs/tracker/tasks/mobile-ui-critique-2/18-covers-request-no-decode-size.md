# 18: Covers request no decode size

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Source:** [A second design critique scores the mobile app 26/40](../../issues/123-a-second-design-critique-scores-the-mobile-app-26-40.md)

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

The root build, lint and unit run follows in the batch for this session.
