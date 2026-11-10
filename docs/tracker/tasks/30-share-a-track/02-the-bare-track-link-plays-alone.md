# 02: The bare track link plays alone

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

## Outcome

The gallery shell moved into one shared surface, and the root route and `/tracks/{id}` both render it. The shell
keeps the session gate, the account sheet and the library body; the root route is now a thin wrapper around it.

The bare route reads the track by id through the new track read and puts it in a one-track queue with no playlist
context. The player bar draws its title and artwork with no playlist name and no artwork link, which the bar already
owned. Entry is idempotent: a queue that already holds that bare track is left alone, position included. A playlist
that was playing when the link opened is replaced by the bare track rather than redirecting the address; a playlist
started from the gallery after entry replaces the address to `/`. The failed read and the unplayable track remain
`03`'s.

See [`30-share-a-track`](../../specs/30-share-a-track.md).
