# 03: The link's failing outcomes

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

## Outcome

The `trackLink` copy is now one shared module, and the left-playlist handoff is a transient flag consumed once across
the replace, never a URL parameter.

The detail redirects to the bare track only for a 404 playlist read; a network or server failure keeps the detail's
normal read failure. When the queue read finds no association, the detail holds the left-playlist flag and redirects
to the bare track; when the association exists but cannot play, it stays and shows the cannot-play notice with its
reason. The bare route shows the not-available notice for a failed track read and the cannot-play notice for a known
track that is not stored; a playable track reached after the left-playlist redirect plays alone and carries the left
notice. The bare entry's redirect baseline keeps the address on a failed entry and replaces it only when a queue
started from the gallery changes what plays.

See [`30-share-a-track`](../../specs/30-share-a-track.md).
