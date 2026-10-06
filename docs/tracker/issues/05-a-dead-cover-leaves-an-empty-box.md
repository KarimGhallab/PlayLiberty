# 05: A dead cover leaves an empty box and calls Google

**State:** `needs-triage`
**Category:** `bug`

## Observed

The cover is the playlist's `coverUrl`, a `https://i.ytimg.com/vi/<id>/hq.jpg` URL, rendered whenever it
is non-null:

- [`PlaylistHeader.tsx:649-655`](../../../apps/web/src/shared/components/PlaylistHeader/PlaylistHeader.tsx)
  (row) and `613-619` (card): `coverUrl === null ? null : <img src={coverUrl} alt="" />`.
- The no-art sleeve is gated on `coverUrl === null`, not on the image loading.

When the URL exists and the image 404s (exactly the removed-video case the product is built around), the
`<img>` fails and leaves an empty box. The library also makes a third-party request to Google from a
private instance.

## Expected

A cover that fails to load falls back to the sleeve the way a null cover does (`onError` toggles to
no-art), so a dead thumbnail is not an empty box. Longer term, the cover is as durable as the track: stored
beside the audio like the track thumbnail, so a removed video never removes the artwork either.

## Evidence

- Live, 2026-10-05: the three seeded playlists requested `i.ytimg.com` covers and all three 404'd, leaving
  the box empty (the browser console logged the three 404s).
- Critique run `views-library-librarypage-librarypage-tsx-a51b86be`, Priority Issue P2.
