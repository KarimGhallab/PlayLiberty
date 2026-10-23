# Crop a playlist cover on upload

Status: ready
Labels: `enhancement`

## Problem Statement

The cover dialog previews every image through a centered square, but the stored image keeps its aspect. The square is therefore arbitrary: an off-center subject is cut, and a tall poster loses its top or bottom. The person choosing the cover can see what the square shows but cannot move it. The custom cover is the playlist's own identity, so the one image somebody chose should be framed on purpose rather than by the middle of the file.

## Solution

When a new cover image is chosen, the dialog's square becomes a crop stage: drag to pan, a slider to zoom, and a Reset. Crop is optional. The centered square is the default, and Save works without touching the controls. The browser sends the original file with the visible square as four fractions. The server auto-orients the image, extracts that square, caps it, and stores one square WebP. Only a new upload is cropped; an existing custom cover is shown read-only until a file is chosen again. Every surface already renders a square, so the stored cover now matches what the dialog showed.

## Implementation Decisions

- **Crop is part of a new upload, not an edit of a stored cover.** The server keeps only the square it extracted; the uncropped original is not retained. Opening the dialog on an existing custom cover shows it as a preview only, and changing the framing means choosing the image again. _Decided here:_ upload only matches the requested scope. Retaining originals would add a second stored file, a schema field, and a read path for a re-crop nobody asked for.
- **Every new stored cover is square.** The centered square is applied even when the user never touches the controls. The crop happens before the existing 1600px cap, so the stored aspect matches every surface. _Decided here:_ every surface draws the cover with `object-fit: cover` in a square, so the unused sides were never visible; preserving them preserved nothing.
- **One square crop, and no other shape.** There is no ratio picker, freeform handle, rotate or flip. The dialog and every cover surface are square.
- **Crop lives inside the existing dialog.** After a valid file is chosen, the existing square, 280px at its widest, becomes the crop stage. The square stays the drop target and Choose image stays the labelled button. Choosing another file resets the crop. There is no second screen or step. _Decided here:_ the dialog already owns selection, preview, Save and discard; a crop screen would duplicate those states for one image.
- **Crop is optional.** Save is enabled as soon as a valid file is chosen, and the centered square is what gets stored if the user does nothing. The crop is never a gate.
- **The controls work by pointer and keyboard.** Drag pans the image. A horizontal `role="slider"` named Zoom follows the volume and position sliders' pattern, so it takes pointer and arrow keys. The stage is focusable, and arrow keys pan it. Reset returns to centered at 1x. One hint line is translated in both catalogues. Wheel and pinch zoom are not part of this version. _Decided here:_ the slider makes zoom usable by touch and keyboard without inventing a second control pattern.
- **Zoom starts at cover and is capped by quality.** 1x is the smallest scale that fills the square. The maximum is `min(3, 640 / shortEdge)`, where `shortEdge` is the image's shorter source dimension, and never below 1x. A source shorter than 640px does not zoom. The slider reads a multiplier such as `1.0x` from 1.0 to the maximum. _Decided here:_ a fixed 3x would store a soft cover from a 1000px photo. The server never enlarges, so this floor is the only quality guard. A 90-degree orientation swaps the two dimensions but not the shorter one.
- **The browser computes the visible source rectangle, not pixels.** The crop is four fractions of the image as displayed: `cropX`, `cropY`, `cropWidth` and `cropHeight`, each in `0..1`, with `x + width <= 1` and `y + height <= 1`. The math uses the rendered image and the stage, so it does not depend on EXIF metadata. The image is previewed with a CSS transform; there is no canvas and no client re-encode. _Decided here:_ the server remains the only image processor, as spec 14 decided, and a transform preview costs no second encode.
- **The upload stays a raw image body with four optional query fields.** `POST /playlists/:playlistId/cover` gains optional `cropX`, `cropY`, `cropWidth` and `cropHeight`. All four travel together or none do. Absent means the centered square. A partial, invalid or out-of-bounds set answers `422 unprocessable_request`. The body limit, accepted content types and response shape are unchanged. _Decided here:_ named query fields fit the existing query-schema style. Multipart or a second endpoint would add a format for four numbers.
- **The server orients, then crops, then caps.** The fractions apply to the auto-oriented image, matching what the browser displayed. The extracted square is resized to fit 1600px without enlargement and written as WebP at the existing quality. The stored file remains immutable and versioned; replacement, the old-file delete and the prune are unchanged. _Decided here:_ orienting before cropping is what makes the same fractions mean the same region on both sides.
- **No schema, migration or read change.** The stored path and version stay as they are. Existing custom covers keep their current aspect and are not re-cropped. A direct API upload with no crop fields stores the centered square.
- **The dialog's states extend, they do not change.** A failed save keeps the dialog and the crop. Cancel, Escape and the scrim still ask once when a file is selected. Remove is unchanged and unaffected by crop.
- **The tests prove the region, not just the call.** The server test crops an asymmetric image and asserts the kept region, and an EXIF-rotated image asserts that orientation happens before the crop. The web tests cover the fraction math, drag and slider, Reset, the optional centered save, and the dynamic maximum. The e2e journey uploads a file, pans and zooms, saves, reloads and sees the same square.

## Out of Scope

- Re-cropping an already stored cover without choosing the file again, and retaining the uncropped original.
- A dark stage or dimmed surround around the crop, and any banner beyond the one hint line. The dialog's existing surface is used.
- Wheel or pinch zoom, rotate, flip, filters, aspect ratios other than square, or a grid overlay.
- Crop for the first-track fallback, the sleeve, track thumbnails, the player bar or Media Session artwork.
- Uploading or cropping from the mobile client.
- A new endpoint, a multipart upload, client-side storage, or upload progress.
- A migration that re-crops existing covers.
- Any change to the audio pipeline or the no-transcoding rule.
