# 02: The cover sheet saves a chosen image

**Status:** ready-for-agent
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** None on the code. The human installs `expo-image-picker` and `expo-file-system` in the mobile
workspace and rebuilds the Android dev client before this ticket is run.

## What to build

The Cover item in a playlist's actions sheet opens a real cover sheet on both surfaces that draw the actions menu,
the gallery and the detail, replacing the "arriving" placeholder. The sheet shows the playlist's current cover in a
square through the existing cover chain, asks for photo-library permission when it opens, and offers Choose image.

A chosen image is previewed in the square with the picker's JPEG rendition. It is refused before any request when it
is not JPEG, PNG or WebP or when it exceeds 5 MB, with one sentence in the sheet. Save is disabled until an image is
chosen; it uploads the chosen file's bytes as the raw body with its content type and no crop fields, so the server
applies its centred square. The busy state blocks a second press and every dismissal. A failed save keeps the sheet
and the chosen image. A chosen image makes Cancel, the backdrop, the drag and the back request ask once before
discarding. Remove is offered only while a custom cover exists, asks once inline, and on success the sheet shows the
playlist's fallback cover.

The mutation answers the updated playlist, so the acting client writes it into the playlist read and asks the
library and playlist reads again; the detail and the gallery show the new version without a manual refresh. A
reader's sheet still carries no Cover item. The placeholder component is deleted.

## Acceptance criteria

- [ ] The gallery and the detail both open the cover sheet from their actions menu, and only for an owner or a
      write collaborator.
- [ ] Save is disabled without an image, and the chosen image's raw bytes are sent with its content type and no
      crop fields.
- [ ] A wrong type and a file over 5 MB are refused before a request, with the sheet and its image intact.
- [ ] The sheet cannot be dismissed while saving, and a failure keeps the sheet and the image.
- [ ] Cancel or any dismissal after choosing asks once; Remove asks once and is absent without a custom cover.
- [ ] The gallery and detail reads show the new or removed cover's version after the answer.
- [ ] The photo library is requested when the sheet opens, not at launch.

## Verification

- `pnpm --filter @playliberty/mobile run test` covers the sheet seam with the picker mocked.
- `pnpm --filter @playliberty/mobile run typecheck` and `pnpm run lint:check` pass.
- On `emulator-5554`, a cover set from the gallery appears on the card and the detail, and Remove returns both to
  the fallback.
