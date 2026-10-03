# 03: Add a playlist from the gallery

**What to build:** This is where content enters the instance. The empty gallery's action and a control in the
header open a dialog carrying the single URL field the create-playlist schema defines. Submitting it posts to
create a Synced playlist; on success the dialog closes, the list is invalidated, and the person stays in the
library rather than being taken into the new playlist. The new item arrives from the server already in
`syncing`, which is the state the route writes, rather than from an optimistic row the server has not made. An
empty or malformed URL is refused by the schema and no request is made, and a refused create shows the problem
beside the field rather than inventing a message.

**Blocked by:** [`02`](02-an-empty-gallery-not-an-empty-playlist.md).

**Status:** ready-for-agent

**Labels:** `enhancement`, `ready-for-agent`

- [ ] Submitting the dialog with a valid URL posts it, closes the dialog, and leaves the person in the library.
- [ ] The new item appears from the server, already marked as syncing, with no optimistic row before it.
- [ ] An empty or malformed URL is refused by the schema and no request is made.
- [ ] A refused create shows the server's problem beside the field rather than a client-invented message.
- [ ] The request carries the client header, and the mutation invalidates the list.
