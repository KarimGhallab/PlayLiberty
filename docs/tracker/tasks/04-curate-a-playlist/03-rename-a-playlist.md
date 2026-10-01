# 03: Rename a playlist

**What to build:** An owner renames a playlist and touches nothing else. The name is trimmed before it is
checked, a name that is empty after trimming is refused, and the existing one-to-two-hundred bound still
applies. The rename writes the name and the row's updated timestamp and leaves the source, the cover, the
last-synced time and the sync status exactly as they were, because the name is the owner's and the source is
not. A write collaborator, a read collaborator, a stranger and a missing playlist all answer `404`, so the
route never confirms a playlist the caller may not manage.

**Blocked by:** None. Can start immediately.

**Status:** ready-for-agent

**Labels:** `enhancement`, `ready-for-agent`

- [ ] An owner renames a playlist, and the stored name is the trimmed input.
- [ ] A name that is empty after trimming is refused.
- [ ] A name longer than two hundred characters is refused.
- [ ] A write collaborator, a read collaborator, a stranger and a missing playlist each answer `404`.
- [ ] A rename changes the name and the updated timestamp and nothing else: the source, cover, last-synced time and sync status are untouched.
- [ ] The request is refused without the client header.
