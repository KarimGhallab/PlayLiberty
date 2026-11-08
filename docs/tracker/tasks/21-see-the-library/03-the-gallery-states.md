# 03: The gallery's three other states

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

## Outcome

The gallery now draws its three non-list states before the grid. A pending read draws `GallerySkeleton`: six card placeholders in two columns, announced once as "Loading playlists." with the placeholders hidden from the accessibility tree. A failed read draws `ReadFailure`: the problem's sentence from `problemDetail` with `library.readFailed` as the fallback, and a Try again control that refetches the read and reports its in-flight state. A successful read with no playlists draws `EmptyGallery`: the heading, the promise and one labelled Add a playlist action.

The empty action calls the route's `onAddPlaylist`. The route supplies it as a no-op for now; the add sheet that answers it lands in `05`.

The gallery's tests cover the skeleton instead of the empty body, the failure body instead of the empty body, the retry calling the refetch, the empty body's heading, promise and action, and the action calling the add callback.

See [`21-see-the-library`](../../specs/21-see-the-library.md).
