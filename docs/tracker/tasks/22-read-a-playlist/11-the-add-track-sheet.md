# 11: The add-track sheet

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

## Outcome

The detail carries the gallery's round plus for an owner or a write collaborator, and no action for a reader. It
opens a sheet with the video link, a checklist of the writable playlists from the gallery's first page, the current
playlist first and preselected, and a note when the read was cut at that page. The detail's own playlist leads even
when it falls past the page.

The link is checked against `AddTrackInputSchema` plus the playlist-link rule before a request; a typed link asks
once before the sheet is discarded. One request carries the batch, and the sheet draws one outcome per chosen
playlist in the order chosen: added, already there or refused. A refusal names the playlist and no cause. A mixed
batch stays open and a clean one closes. Add, the field and the checklist lock while the batch runs.

The picker scrolls under a sheet capped at 90% of the visible frame, so the actions stay on screen when the
keyboard rises. The footer is now the shared `SheetActions`, also used by the playlist add sheet. All copy is in
both catalogs: `playlistsLabel`, `firstPage`, the three outcome words and `failed`.

See [`22-read-a-playlist`](../../specs/22-read-a-playlist.md).
