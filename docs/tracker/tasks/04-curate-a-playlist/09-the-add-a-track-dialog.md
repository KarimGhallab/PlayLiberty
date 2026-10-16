# The add-a-track dialog

**Status:** resolved

## Outcome

One `POST /tracks` adds a pasted video to the chosen writable playlists and returns one outcome per playlist. The dialog preselects the current playlist, refuses a playlist URL in the field before the request, closes on an all-success batch, and stays open on any refusal, naming the refused playlists without a cause, because the route withholds the reason on purpose.

See [`04-curate-a-playlist`](../../specs/04-curate-a-playlist.md).
