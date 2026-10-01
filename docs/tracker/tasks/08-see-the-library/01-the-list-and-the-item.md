# 01: The list and the item

**What to build:** A listener lands on a list of the playlists they can see, their own and the ones shared with
them, in one list and the route's order, with no sections. Each item is the playlist header: the cover, the
name, the association count, the sync state and time, and a share indicator. The cover and the name both link
to the playlist, and the cover's link is hidden from the accessible name so a reader announces one link per
item. A syncing item says so, a failed one says so in the failed tone, and a playlist that has never synced
reads as never synced rather than as a fault. The count is the playlist's stored track count and is not a
promise of playability. This ticket builds the playlist header as the shared component the playlist detail and
the player bar will reuse, so no screen draws a second item that resembles it.

**Blocked by:** None. Can start immediately.

**Status:** ready-for-agent

**Labels:** `enhancement`, `ready-for-agent`

- [ ] A populated library renders one item per playlist with its cover, name, count and sync line, in the order the route returned.
- [ ] An owned playlist and a shared one are the same item in the same list, with no sections.
- [ ] A playlist in `syncing` renders as syncing, a failed one renders the failed state, and a never-synced one reads as never synced rather than as a fault.
- [ ] The cover and the name both navigate to the playlist, and the cover link is not separately announced.
- [ ] The count shown is the stored track count, including tracks that are not playable.
- [ ] The page has no search, sort, filter or pagination control, and the list is read once per page.
- [ ] The library writes nothing on arrival, and the component has no axe violations.
