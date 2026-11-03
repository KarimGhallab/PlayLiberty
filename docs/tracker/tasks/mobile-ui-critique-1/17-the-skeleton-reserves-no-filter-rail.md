# 17: The library skeleton reserves no filter rail

**Status:** resolved
**Labels:** `bug`, `ready-for-agent`
**Source:** [A design critique scores the mobile app 26/40](../../issues/108-a-design-critique-scores-the-mobile-app-26-40.md)
**Blocked by:** None. Can start immediately.

## Observed

The gallery's loading state holds the header and a grid of card placeholders, but no scope and status rail and no
pinned heading. When the data lands the grid drops about 60dp and gains a heading, so the first card a thumb reaches
for is not where it was a moment earlier. On a cold start the header also swaps its wordmark for the real one.

## Expected

The skeleton holds the arrangement the content will take, so nothing above the fold moves when the read lands.

## Evidence

- `apps/mobile/src/views/library/GallerySkeleton/GallerySkeleton.tsx`.
- `apps/mobile/src/views/library/PlaylistGallery/PlaylistGallery.tsx`: the rail and the pinned heading drawn only once
  the counts exist.
- The 2026-11-03 critique screenshots of the loading state and the loaded library.

## Acceptance criteria

- [x] The loading state reserves the rail's height and the pinned heading when the account has pinned playlists, or
      when the layout cannot know yet, reserves the rail only and no heading.
- [x] No element above the fold moves when the read lands.
- [x] The skeleton keeps announcing itself once.
- [x] A test covers the reserved rail.

## Outcome

`GallerySkeleton` now holds the rail. A 48dp row of three placeholder chips sits where `GalleryFilterBar` lands, the
skeleton takes the same `space-3` gap the loaded list uses, and the grid follows below it. The pinned heading is not
held: a first read has no way to know whether anything is pinned, so the skeleton takes the rail-only form the ticket
allows.

The rail and the grid are hidden from the accessibility tree, so the root still announces "Loading playlists." once.
The header's wordmark swap was already removed by the font gate in ticket 01.

The gallery test asserts the reserved rail at `touchTarget` height in the pending state.
