# 08: The pinned row mounts every cover eagerly

**Status:** resolved
**Labels:** `bug`, `ready-for-agent`
**Source:** [A design critique scores the mobile app 26/40](../../issues/108-a-design-critique-scores-the-mobile-app-26-40.md)
**Blocked by:** None. Can start immediately.

## Observed

The pinned section is one horizontal `ScrollView` that mounts every pinned card and every cover in it on first paint.
The gallery grid below is virtualised, and the detail's list is virtualised with a window, so this is the one repeated
surface that loads with the size of the data rather than the size of the viewport. Nothing caps it: a household that
pins twelve playlists decodes twelve covers on the library's first frame.

## Expected

`docs/DESIGN.md`, "Rules the design keeps": "Images that repeat lazy-load." On a phone that means the list
virtualises, since React Native has no `loading` attribute.

## Evidence

- `apps/mobile/src/views/library/PlaylistGallery/PlaylistGallery.tsx`: the pinned row's horizontal scroll view and the
  card rendered per item.
- The gallery grid and the detail list, both virtualised.

## Acceptance criteria

- [x] The pinned row renders only the cards near the viewport, or otherwise does not fetch a cover it does not draw.
- [x] The peeking next card and the sideways scroll are unchanged.
- [x] A gallery with more pinned playlists than fit renders no more covers than the viewport needs.
- [x] A test or an image-request count records the bound.

## Outcome

The pinned row is a horizontal `FlatList` instead of a `ScrollView`. The first paint mounts
`ceil(viewport / (pinned width + gap))` cards: the step includes the gap, and the ceiling includes the card that
peeks, so the bound is the viewport's own span. The same number bounds each batch and a three-viewport window.
`getItemLayout` uses the known card width and gap, so the list does not measure its cells. A cover is fetched by an
`Image` when its card mounts, so the bound is the cover bound too.

The peek and the sideways scroll are unchanged: the card width is still `galleryPinnedWidth`, the gap is still
`space-3`, and the content-size clamp now calls `scrollToOffset`. Verified on the emulator with three pinned cards:
the third peeked at rest, and a horizontal swipe brought "Egypt" and "Paradis" into view.

The test renders twelve pinned playlists and asserts the drawn `pinned-card` count is at most the viewport bound and
below the whole row.
