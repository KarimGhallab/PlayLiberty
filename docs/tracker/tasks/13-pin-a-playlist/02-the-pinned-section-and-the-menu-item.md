# 02: The pinned section and the pin in the item's menu

**Blocked by:** [`01`](01-the-pin-on-a-playlist.md).
**Status:** open
**Labels:** `enhancement`, `ready-for-agent`

## Objective

Pinning works from the item's actions menu, and the playlist leaves the gallery's list to appear in a named
section above it. Unpinning puts it back. The section is not drawn at all when the account has pinned nothing,
so an account that never pins sees exactly the gallery it has today.

## Context

Read [`13-pin-a-playlist`](../../specs/13-pin-a-playlist.md), and the library record's section on the pinned
section and the pin on the cover, which owns the drawing and its reasons.

`01` lands the read and the write: the gallery's read already returns pinned items first with the flag on each,
so the page groups on the flag and never sorts. The module that owns a playlist's actions already owns their
single owner and their write rule at the client, and the per-playlist settings are the precedent for a write
that moves the value at once, puts it back on a failure, and draws the screen's notice.

## Scope

- **The gallery draws two lists.** A labelled section above the gallery's own list, holding the items whose
  flag is set, and the existing list holding the rest. Each group is its own list, so the grouping is real to a
  reader who cannot see it, and the heading is the section's accessible name.
- **The heading is the section's name alone**, with no count, and the section stands the record's own distance
  from the list rather than behind a rule.
- **The section is withdrawn when nothing is pinned**, and the loading state is unchanged.
- **The item's actions menu gains Pin and Unpin**, over the same owner that holds the rest of the actions,
  rather than a second owner of the same write. A read collaborator's menu is still empty, which is the
  record's rule and stays true; pinning reaches them through the cover control in `03`.
- **The write moves the item at once and puts it back on a failure**, which draws the notice. There is no toast
  on success: the item moving between the two groups is the whole answer.
- **The acting client invalidates the gallery read**, because the read's order is what changed, and no event
  arrives for a pin.
- **Both catalogues gain the keys**: the section heading, the two menu labels, and the failure notice, with the
  heading inflected for playlists in French.
- **The mock handlers gain the pin write**, and every playlist literal in the web tests gains the required flag.

## Out of scope

The cover control and its reveal (`03`), the specimen and the glyphs (`04`), the browser journey (`05`), and
the pin on the card arrangement.

## Verification

- `pnpm test:unit`, `pnpm run build`, `pnpm run lint` and prettier pass.
- The library page tests prove: a flagged item is drawn in the section above the list, under the section's own
  name, and is not drawn in the list below; no section is drawn with nothing pinned; the items below keep the
  order they had; the menu reads Pin on an unpinned item and Unpin on a pinned one; a read collaborator sees no
  menu and no item moves; a press asks the server for the change; and a failure leaves the item where it was and
  draws the notice.
