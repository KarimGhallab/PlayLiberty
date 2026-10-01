# 04: A shared item names its owner

**What to build:** A shelf of several people's playlists is legible. A playlist shared with the account names
its owner through the account directory, and the account's own playlists carry no line, because the item's
access already says it is theirs. The line is resolved from the owner id the playlist carries against the
directory, so it is one extra read and no new server route. An owner who is not on the directory page leaves
the item showing the share indicator alone rather than a placeholder name, because a placeholder reads as a
decision.

**Blocked by:** [`01`](01-the-list-and-the-item.md).

**Status:** ready-for-agent

**Labels:** `enhancement`, `ready-for-agent`

- [ ] A shared item renders the owner's display name, and an owned item renders no line.
- [ ] The name is resolved from the owner id through the account directory, with no new server route.
- [ ] An owner missing from the directory page leaves the item showing the indicator alone rather than a placeholder name.
- [ ] A revoked playlist disappears on the next list read and nothing else on the screen changes.
