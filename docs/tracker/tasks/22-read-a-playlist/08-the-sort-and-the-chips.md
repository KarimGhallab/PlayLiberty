# 08: The sort and the chips

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

## Outcome

The detail now keeps one rail below the identity: the sort control then the six status chips, on one line that
scrolls sideways like the gallery's rail. The sort control is borderless and a vertical rule separates it from the
chips, matching the gallery's filter rail. The identity, the rail and the rows scroll together. The chips keep their
whole-playlist counts.

The sort opens a sheet of three radios: Playlist order, Newest first and Oldest first. Choosing one closes the sheet
and writes the saved sort. `useUpdateSort` moves the playlist's cached value on the press and asks every playlist read
again after the server answers, so the list and the queue follow the new order. A refusal restores the saved value and
shows a sort-specific notice. The control is disabled for a read collaborator, while the list is shuffled, and while
the write is in flight.

The chips are All and the five file states with the whole-playlist counts. A chip filters the tracks read by state;
the counts do not follow it, and paging stays within the filtered total. A filter with no rows names the state and
offers Show all, which returns the whole list. The chips are disabled while the list is shuffled, and the filter steps
aside for the queue's order and returns when shuffle is off. The filter is visit state and clears when the screen
leaves. Play and Shuffle still start from the queue route, never the filtered list.

The status chip words, tones and filter-empty sentences moved to one shared model used by the gallery and the detail.
The two sort notice sentences were added to both catalogs.

See [`22-read-a-playlist`](../../specs/22-read-a-playlist.md).
