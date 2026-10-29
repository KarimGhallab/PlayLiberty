# Set a playlist cover on mobile

Status: ready
Labels: `enhancement`, `ready-for-agent`

## Problem Statement

The playlist's cover is its identity in a gallery read by sight, and the owner cannot set one from the phone where
the photograph already is. The web client opens a file picker, previews a square, crops it and uploads the bytes; a
phone has a photo library, a touch surface and no file dialog, and the stored cover is a square the server extracts.

## Solution

A cover sheet from the playlist's actions sheet, for the owner and a write collaborator. It shows the current cover
in a square, offers Choose image from the photo library, and turns that square into the crop stage: drag to pan,
pinch or use the zoom control, Reset to return to centered. Save uploads the chosen image with the crop's four
fractions, and Remove asks once and deletes the custom cover. The stored square is what every reader sees.

## User Stories

1. As an owner, I want to choose an image from my photo library, so that the playlist looks like mine.
2. As an owner, I want the square to be the crop stage, so that I see exactly what will be stored.
3. As an owner, I want to pan the image, so that the subject is not cut off.
4. As an owner, I want to zoom in, so that I can frame a detail.
5. As an owner, I want zoom to stop before the image goes soft, so that the cover stays sharp.
6. As an owner, I want a zoom control a screen reader can use, so that cropping does not need sight.
7. As an owner, I want Reset, so that I can start from the centred square again.
8. As an owner, I want Save enabled as soon as an image is chosen, so that cropping is optional.
9. As an owner, I want the centred square stored if I do nothing, so that a quick change is one press.
10. As an owner, I want a busy state while saving, so that I do not upload twice.
11. As an owner, I want a failed save to keep my crop, so that I do not start again.
12. As an owner, I want Remove to ask once, so that a stray tap does not delete my cover.
13. As an owner, I want a file that is too large refused before it is sent, so that I am not waiting on an upload that cannot land.
14. As an owner, I want a format the server cannot store refused before it is sent, so that the answer is immediate.
15. As an owner, I want to be asked before a chosen image is discarded, so that I do not lose it to a stray tap.
16. As a collaborator, I want to set the cover, so that I can help curate a playlist I can write to.
17. As a read collaborator, I want no cover control, so that I am not offered a refusal.
18. As a reader, I want the new cover everywhere, so that the gallery and the detail agree.
19. As a reader, I want the cover to fall back to the first track and then to the sleeve, so that a missing file never draws an empty square.
20. As a reader, I want the cover to survive a sync, so that the source cannot overwrite it.
21. As a screen-reader user, I want the sheet's controls named, so that I can set a cover without sight.
22. As a French-speaking owner, I want the sheet in French, so that the app stays in my language.

## Implementation Decisions

- **The cover is a sheet opened from the actions sheet, and it exists for the owner and a write collaborator.** A read
  collaborator's sheet has no Cover item.
- **The image comes from the photo library through `expo-image-picker`, and there is no camera capture.** `Decided
here:` the web's verb is a file picker, and a camera would add a permission and a second source for one image. The
  picker returns a JPEG rendition, so a library's HEIC never reaches a server that refuses it.
- **The square is the crop stage, and the crop is one square with no other shape.** Drag pans, pinch zooms, an
  accessible zoom control moves in steps, and Reset returns to centred at 1x. There is no rotate, flip, filter or
  ratio picker.
- **The app computes four fractions of the displayed image, not pixels.** The upload is the raw image body with
  `cropX`, `cropY`, `cropWidth` and `cropHeight` as query fields, all four or none. The server orients, crops and
  caps, exactly as the web's upload does. `Decided here:` one image processor, and a transform preview that costs no
  second encode.
- **Zoom starts at the scale that fills the square and is capped at `min(3, 640 / shortEdge)`, never below 1x.**
  `Decided here:` the web's rule, kept because the server never enlarges and a fixed maximum would store a soft cover.
- **The file is validated before the upload: JPEG, PNG or WebP, at most 5 MB.** A refused file keeps the sheet with
  one sentence.
- **Save is disabled until an image is chosen, and the sheet cannot be dismissed while an upload is in flight.** A
  failed save keeps the sheet and the crop. Remove asks once inline and is offered only while a custom cover exists.
- **A chosen image makes Cancel and the sheet's dismissal ask once before discarding.**
- **The cover's version is the cache key**, so a replacement reaches every screen and every client through the same
  read.
- **Inherited decisions are referenced, not restated:** the cover chain, the write rule, the 5 MB cap, the server's
  normalisation, the immutable versioned file, the read's cache behaviour and the prune are
  [`14-upload-a-playlist-cover`](14-upload-a-playlist-cover.md)'s; the square, the fractions, the orientation order
  and the zoom cap are [`17-crop-a-playlist-cover`](17-crop-a-playlist-cover.md)'s.

## Testing Decisions

- A test earns its place only if it fails when an owner would notice. The tests assert that Save is disabled without
  an image, that the centred square is what is sent when nothing is moved, that the four fractions travel together,
  that a 6 MB file is refused before a request, and that Remove asks once. They do not assert the stage's size or
  the gesture's inertia.
- **The crop's arithmetic is tested at the module's seam**: a panned and zoomed stage produces fractions inside the
  bounds, and Reset returns centred at 1x. Prior art is the web's crop tests.
- **The sheet is tested at its own seam**: the picker's result, the busy state, the failure keeping the crop, the
  discard confirmation and the remove confirmation.
- **The critical journey is a Maestro flow**: choose an image, pan, zoom, save, leave the playlist and return, and see
  the same square.
- **Cut tests:** no test of the pinch gesture's physics, the preview's transform, or the server's pipeline, which the
  web's tests already own.

## Out of Scope

- Camera capture, and any image source beyond the photo library.
- Re-cropping a stored cover without choosing the image again.
- Rotate, flip, filters, aspect ratios other than square, and a grid overlay.
- Client-side normalisation, client-side storage and upload progress.
- Covers for tracks, the player bar, the notification or the lock screen.
- A cover history, an undo, and per-account covers.

## Further Notes

- The notification and the lock screen draw the cover as their artwork, so a cover change reaches them through the
  same versioned URL.
- The photo-library permission is requested when the sheet opens, not at launch.
