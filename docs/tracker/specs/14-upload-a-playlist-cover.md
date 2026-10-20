# Upload a playlist cover

Status: ready
Labels: `enhancement`, `ready-for-agent`

## Problem Statement

A playlist draws its cover from its first track's stored thumbnail. That is a useful default and a good fallback, but it is not the playlist's identity. Two playlists that begin with the same video look the same, a playlist whose first track has no thumbnail falls back to a sleeve, and an empty playlist has no cover to choose. The person who owns the playlist cannot say what it should look like.

The cover also cannot be an account's own choice. A playlist is shared with read and write collaborators, and a cover says what the playlist is, so it belongs to the playlist and every account that can see it. It is not a per-account placement like a pin, and it is not a rating.

The current product also states that a playlist owns no image. This feature reverses that statement deliberately, so the specification has to record the reversal and amend the documents that repeat the old rule.

## Solution

An owner or a write collaborator can set a custom cover for a playlist, and every account that can read the playlist sees it. The action lives in the playlist's own actions menu on the detail and in the gallery. It opens one compact dialog with a single square cover: the cover accepts a dropped image, and a labelled button below opens the file picker. The same dialog removes the custom cover after one confirmation.

The browser checks the file's type and size and shows a preview. The server owns the stored image: it validates the upload, auto-orients it, caps its long edge at 1600px, strips metadata, and stores it as WebP. A replacement is a new version and a new URL; a removal returns the playlist to its first track's cover, and then to the sleeve. A sync never replaces or removes a custom cover.

## User Stories

1. As an owner, I want to choose a cover for my playlist, so that it looks like mine rather than like whichever track happens to be first.
2. As a write collaborator, I want to change a playlist's cover, so that a playlist we curate together keeps the identity we chose.
3. As a read collaborator, I want to see the same custom cover as everyone else who can read the playlist, so that the playlist has one identity.
4. As a listener, I want to see the custom cover in the gallery and on the detail, so that I recognise the playlist wherever it appears.
5. As an owner, I want to remove a custom cover, so that the playlist can return to its natural first-track cover.
6. As a listener, I want removal to fall back to the first track's artwork, so that I do not have to upload another image immediately.
7. As a listener, I want the sleeve to remain the final fallback, so that a playlist with no usable artwork never draws an empty box.
8. As a listener, I want a broken or missing custom cover to fall back to the first track and then the sleeve, so that a bad file does not break the screen.
9. As a listener, I want a custom cover to survive a sync, so that a source change never silently replaces my choice.
10. As an owner, I want the cover action in the playlist's actions menu, so that it is where the playlist's other actions live.
11. As an owner, I want the same action on the detail and in the gallery, so that I can change the cover wherever I am looking at the playlist.
12. As a write collaborator, I want the action to be available to me, so that I can maintain a shared playlist.
13. As a read collaborator, I do not want an edit control I cannot use, so that the menu tells the truth about my access.
14. As a pointer user, I want to drop an image onto the cover itself, so that replacing it is quick.
15. As a keyboard user, I want a labelled button that opens the file picker, so that I never need drag and drop.
16. As a phone user, I want the upload button below the cover, so that the flow works without a drag gesture.
17. As a listener, I want to preview the image in the square before saving it, so that I know how the cover will be cropped.
18. As a listener, I want to be told when the file is not a JPEG, PNG or WebP, or is larger than 5 MB, so that I can fix the choice.
19. As a listener, I want a saving state while the cover uploads, so that the dialog is not dismissed or pressed twice.
20. As a listener, I want the dialog to stay open with one sentence when the upload fails, so that the failure is not silent.
21. As a listener, I want to confirm removal once, so that a stray press does not discard the custom cover.
22. As a listener, I want to confirm before closing with an unsaved selection, so that I do not lose the file I chose.
23. As a listener, I want the custom cover to appear after a reload, so that it is stored on the server rather than in one browser.
24. As a listener, I want another account's change to reach my open screen, so that the gallery and detail stay current.
25. As a developer, I want the upload to be one route with one stored image, so that the playlist read and the cover read cannot disagree.
26. As a developer, I want the stored cover to be normalised once on the server, so that every client and every future client gets the same dimensions, format and metadata policy.
27. As a developer, I want the cover file to be versioned, so that a replacement cannot be hidden by a cached image.
28. As a developer, I want the weekly orphan prune to clean unreferenced cover files, so that failed deletes do not accumulate on disk.
29. As an account, I want a playlist I cannot see to answer as one that does not exist, so that the cover routes do not reveal the playlist.
30. As a maintainer, I want the old "the playlist owns no image" statements amended, so that the documentation matches the feature.

## Implementation Decisions

- **A custom cover is one image per playlist, shared by everyone who can read it.** A nullable `coverPath` and a nullable `coverUpdatedAt` live on the playlist row. The path is server-only; the contract carries `coverUpdatedAt` and never the path. The existing `coverTrackId` stays as the first-track fallback. _Decided here:_ the alternative, a per-account cover, would make the same playlist look different to each collaborator and contradict the playlist as one shared object.
- **The custom cover wins over the first-track cover, and the fallback is a chain.** The cover shown is the custom image when one exists, otherwise the first track's thumbnail, otherwise the sleeve. Removing the custom cover returns to the first track, not to a blank. A custom cover that fails to load falls back to the first track, and then to the sleeve. The custom record stays until a user removes it, even when its file is missing. _Decided here._
- **The custom cover is per playlist and survives sync.** Sync never writes, replaces or clears the cover path or version. A source change cannot overwrite the choice. _Decided here,_ because the cover is the playlist's own identity and the source has no cover field today.
- **The owner and a write collaborator may set or remove the cover; a read collaborator may only see it.** Both mutations resolve the playlist through the entry seam at the write need. The cover read resolves it at the read need. A stranger, a missing playlist and a playlist the account cannot see are the same not-found answer. _Decided here,_ because a cover is a change to the playlist and the existing write rule is the one the menu already uses.
- **The upload is a raw image body, not multipart.** A `POST` to the playlist's cover route carries `Content-Type: image/jpeg`, `image/png` or `image/webp` and the bytes. A `DELETE` removes the cover. The upload answers the updated playlist; the delete answers no content. A delete with no custom cover is an idempotent no-op. The route accepts the three image content types through a raw-body parser, and no multipart parser is added. _Decided here:_ one file, no other fields, so a multipart envelope would add a dependency and a format without adding a decision.
- **A file is capped at 5 MB before it reaches the normaliser.** The client rejects a larger file immediately. The route has a 5 MB body limit, and the edge proxy raises its request-body limit to 6 MB so the route's answer is the one the client sees. _Decided here:_ the cover is a small image, and an unbounded upload is a memory and storage risk.
- **The server normalises every accepted image with `sharp`.** The input must decode as JPEG, PNG or WebP, must not exceed 64 megapixels, and must be at most 5 MB. The pipeline auto-orients, resizes to fit within 1600px on the long edge without enlarging, strips metadata, and writes WebP at quality 0.86. The stored cover is always `image/webp`; the input format is not preserved. _Decided here:_ `sharp` is purpose-built for images, its pixel limit guards decompression bombs, and one server pipeline is authoritative for the web client and every future client. Client-side normalisation is not the boundary, because a direct API call can bypass it.
- **The stored file is immutable and versioned.** Each successful upload writes a new file under a covers directory, named from the playlist id and a random token, and records its relative path in `coverPath`. The writable temp file is renamed into place before the row is updated. A replacement deletes the previous file only after the new row commits. `coverUpdatedAt` changes on every upload and is cleared on removal. _Decided here:_ an immutable file makes replacement atomic and leaves the prune with one reference rule.
- **The cover read is a media route at the playlist's read need.** It serves the stored file as `image/webp` when a custom cover exists, and answers not-found when it does not. The client builds the URL with the cover version as a query parameter, so a replacement is a new cache key. The response is private and cached for the media store's thumbnail window. _Decided here:_ the versioned URL lets a cover stay cached while a replacement still reaches every client.
- **A cover change publishes the existing playlist-changed event after commit.** The read-level audience receives it, the library list and the detail refetch, and the new version reaches every open screen. The acting client also invalidates its own playlist reads. _Decided here:_ a new event kind would carry no more information than the playlist-changed hint.
- **The weekly orphan prune also sweeps cover files.** It builds the set of cover paths referenced by playlists, scans the covers directory, and deletes files that no playlist references and that are older than one hour. The grace window protects an upload written before its row commits. The prune logs the count and leaves the rest of its orphan behaviour unchanged. A playlist delete removes its cover file as a best effort; a failed delete is left to the prune. _Decided here,_ because the existing prune is already the one scheduled janitor and a second sweep would be a second schedule to maintain.
- **The playlist read gains one nullable cover version.** The contract keeps `coverTrackId` and adds `coverUpdatedAt`, the version that says a custom cover exists and doubles as its cache key. The stored path is not part of the contract. _Decided here:_ one field answers both "is it custom?" and "which image?" without exposing server storage.
- **The action is a playlist action, not a cover overlay.** The shared playlist-actions model gains a Cover item for the owner and write collaborator, and the detail and gallery both draw that one menu. A read collaborator's menu does not gain it. _Decided here:_ the actions menu is already where a playlist's changes live, and a control over the artwork would be a second surface for the same action.
- **The dialog is the compact single-cover dialog.** It uses the shared dialog shell, including its existing opening, closing, focus-trap and focus-return behaviour. It shows one square cover, not a current-versus-new pair. The square is a drop target; a labelled Choose image button below opens the file picker. The button is the keyboard and touch path; the square is not a button. The dialog is checked at the desk and at the web client's 390px phone arrangement. _Decided here,_ after the prototype comparison.
- **The dialog's states are explicit.** Save is disabled until a file is selected. Saving shows the dialog's busy treatment, the action is not pressed twice, and the dialog cannot be dismissed while the upload is in flight. A failed save or remove keeps the dialog open with one sentence. A selected but unsaved file makes Cancel, Escape and the scrim ask once before discarding. Remove is offered only while a custom cover exists, and asks once inline before deleting. The visible copy is the screen's own: Cover, Playlist cover, Choose image, Remove cover, Save, Cancel, Keep editing and Discard, with the type and size sentence in both catalogues.
- **The browser sends the selected file unchanged; the server does the image work.** The browser validates the type and 5 MB, previews the selected file through an object URL, and uploads the original bytes. It does not use a canvas, does not re-encode, and does not report upload percentage. _Decided here:_ one normalisation owner is easier to reason about and test than two.
- **The header seam chooses the custom cover first.** All three arrangements read the same cover and fallback state. A failed custom image falls back to the first-track thumbnail, and a failed track thumbnail falls to the sleeve. The detail's ground follows the same cover. The failure state resets when either the cover version or the track id changes. _Decided here,_ because the three arrangements must not each invent a fallback.
- **The documents are amended as part of the work.** The product capability list gains a custom playlist cover. The glossary defines the playlist cover and the custom cover, and the media store includes cover files. The architecture records the covers directory and the image normalisation boundary. The design record states that a cover may be custom and keeps the custom, first-track, sleeve fallback. The issues that state a playlist owns no image are marked as superseded or amended. _Decided here._
- **No audio decision changes.** The no-transcoding rule is an audio rule. The stored audio is still served verbatim. Image normalisation is a new, separate image pipeline. _Decided here._
- **The inherited constraints are owned by the architecture and not restated here:** identity from the forwarded edge headers, the client header and origin checks on mutations, the playlist entry seam, the media root ownership, and the server as the only database and media writer.

## Testing Decisions

- **Use the existing seams, not a new low-level one.** The server is tested through the real app over a temporary database and media root, as every playlist route is. The web page is tested through its rendered page and mocked network. One end-to-end journey assembles the real upload, storage, read and second account. The image pipeline has its own route test with a real fixture image; it does not need a separate service seam.
- **The server cases must exist:**
  - an owner uploads a JPEG, PNG and WebP and each is stored as WebP with a long edge no greater than 1600, stripped metadata and a changed cover version;
  - a write collaborator uploads and replaces a cover, and the previous file is gone;
  - a read collaborator reads the cover and receives the custom image;
  - a read collaborator, a stranger and a missing playlist are refused the upload and the delete as not-found;
  - a valid image over 5 MB is refused, an unsupported content type is refused, a non-image body is refused, and an image beyond the pixel limit is refused, each leaving the previous cover untouched;
  - a delete is idempotent when no custom cover exists, and returns the playlist to the track fallback;
  - a playlist delete removes its cover file, and the prune removes an unreferenced cover older than the grace window while keeping a referenced one and a recent one;
  - the cover media route sends the private cache headers and the WebP content type, and a missing cover answers not-found;
  - a cover change publishes one playlist-changed event to the read audience and no event on refusal;
  - the playlist read carries the cover version, and the source sync, rename and other playlist mutations leave it alone.
- **The web cases must exist:**
  - the header uses the custom URL when a version exists, falls back to the track thumbnail when the custom image fails, and falls back to the sleeve when that fails;
  - each of the three arrangements draws the same cover and fallback;
  - the Cover menu item appears for the owner and write collaborator and not for a read collaborator;
  - the dialog rejects a wrong type and an over-size file with its own sentence, previews a valid file, and uploads it;
  - drag and drop selects a file, and the Choose image button is the keyboard path;
  - the dialog refuses to close while saving; a failed save keeps it open with a sentence;
  - Cancel, Escape and the scrim ask before discarding an unsaved selection;
  - Remove appears only for a custom cover, asks once, and falls back on success;
  - the dialog uses the shared dialog's focus trap, Escape and focus return, and the shared animation;
  - an upload success invalidates the playlist and the gallery.
- **The end-to-end journey must exist, because the assembled facts are the feature.** It seeds an owned playlist and one shared with a second account at the read level and another at the write level. It opens the cover dialog from the detail and from the gallery, drops or selects a fixture image, saves, and asserts the cover appears in both the detail and the gallery after reload. The read collaborator sees the cover and has no Cover item; the write collaborator can replace it. Removing it returns the first track's cover, and a playlist with no tracks returns the sleeve. The journey uses the browser's file input, not a stubbed server, and covers the web client's 390px arrangement as well as the desk.
- **A good test here asserts what a person sees and can do.** It does not assert the file name, the query shape or a component's internals. The server tests may assert the stored format, the dimension cap and the absence of metadata because those are the promise of the feature; they reach them through the route's response and the stored file, not through private helpers. The web tests assert the accessible names and the visible fallback, not class names. _Decided here._
- **Prior art:** the playlist route suites for the access matrix and the media headers; the header suites for the cover source and sleeve fallback; the dialog suite for focus, Escape and scrim; the page suites for menu gating and mutations; the prune suite for the orphan sweep; the curate and library journeys for the assembled playlist actions.

## Out of Scope

- Uploading or changing a cover from the mobile client. The API and the stored cover are shared, and the mobile arrangement is not part of this web-only corpus.
- Crop, pan, zoom, rotate controls, filters or any image editor. The preview shows the square crop; the stored image keeps its aspect.
- More than one custom cover per playlist, cover history, undo, or reverting to a previous custom cover.
- Per-account covers or a cover that differs by viewer.
- Choosing a different track's thumbnail as the fallback, or a source-provided cover field.
- Animated GIF, animated WebP, SVG, HEIC, AVIF or any format beyond JPEG, PNG and WebP.
- Preserving EXIF or other metadata. Metadata is stripped by the server.
- Client-side normalisation or client-side storage.
- Covers for tracks, the player bar, Media Session artwork, social cards or any export.
- A separate cover management screen, a cover gallery, or bulk cover changes.
- Any change to the audio pipeline, the no-transcoding rule, or the stored audio.
- A new scheduled job. The cover sweep joins the existing orphan prune.

## Further Notes

- **The reversal is deliberate.** The old artwork issue said the playlist owns no image and the cover is the first track's thumbnail. This spec makes the custom cover the playlist's first owned image, while keeping the first-track thumbnail as the fallback. The old issue is recorded as superseded or amended rather than left as a contradiction.
- **The cover is an identity, not a rating.** It is per playlist, not per account, and it is not a favourite. It changes what everyone who can read the playlist sees.
- **The source cover is still not stored.** The fallback remains the first association's stored track thumbnail. The sync still does not carry a playlist cover URL.
- **The cache and the prune share one version.** The version in the contract is the cache key and the signal that a custom cover exists. The prune never needs to know the version; it compares the stored paths.
- **The upload body limit is a route decision, not a new global limit.** JSON routes keep the server's default; only image uploads take the larger bound. The edge proxy must allow the larger request for the same reason.
- **The design risk is a bright custom cover.** The detail's ground and identity band already sit on arbitrary artwork. A custom cover is no different from a bright first-track thumbnail, so the existing contrast and scrim rules apply; no new colour rule is invented.
- **A custom cover is a small disk cost.** The prune's one-hour grace is the only recovery window for an interrupted write; a file older than that and unreferenced is safe to delete.
