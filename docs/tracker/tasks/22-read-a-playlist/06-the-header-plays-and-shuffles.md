# 06: The header plays and shuffles

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

## Outcome

Play starts the playlist at its first playable track from the whole queue route, never from the loaded page. Shuffle
draws one playable track at random and starts the whole playable order shuffled, with that track at the front. A read
that has not landed is awaited, both controls wait while it is in flight, and an empty queue disables both. A failed
read is the start's notice in both catalogs.

The player store now carries the source order and the shuffle flag. Turning shuffle off restores the saved order and
keeps the playhead; the list draws the shuffled queue's order while this playlist is the queue, and the saved order
again when shuffle is off. The mirror survives leaving and returning to the screen, and the shuffle control shows its
selected state. Every access level may start.

A row press on a queue that is already this playlist moves the playhead in place, so a shuffled order survives the
press rather than being rebuilt. The header still draws no transport; that is spec `23`'s.

No new message keys were needed: the start's empty and unreachable sentences already existed in both catalogs.

See [`22-read-a-playlist`](../../specs/22-read-a-playlist.md).
