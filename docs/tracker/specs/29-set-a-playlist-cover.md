# Set a playlist cover on mobile

Status: resolved
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
- **The notification and the lock screen draw the cover as their artwork,** so a cover change reaches them through the same versioned URL.
- **The photo-library permission is requested when the sheet opens, not at launch.**

## Out of Scope

- Camera capture, and any image source beyond the photo library.
- Re-cropping a stored cover without choosing the image again.
- Rotate, flip, filters, aspect ratios other than square, and a grid overlay.
- Client-side normalisation, client-side storage and upload progress.
- Covers for tracks, the player bar, the notification or the lock screen.
- A cover history, an undo, and per-account covers.
