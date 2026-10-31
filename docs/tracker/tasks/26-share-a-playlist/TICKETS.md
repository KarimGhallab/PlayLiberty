# 26: Share a playlist on mobile

Tickets for [`26-share-a-playlist`](../../specs/26-share-a-playlist.md). One file per ticket, numbered in dependency
order, each declaring its blocking edges.

Spec [`05`](../../specs/05-share-a-playlist.md) already landed the three share routes, the upsert grant, the two
levels, the owner-only rule and the paged account directory. This set carries the mobile surface: the share sheet,
the paged picker with its level buttons, and the journey that proves them. It replaces the Share placeholder that
[`25`](../25-curate-a-playlist/01-one-actions-sheet-on-both-surfaces.md) left on both screens, and it does not
re-open the routes or the web dialog.

`Decided here:` a gallery card's Share opens the same sheet as the detail's, rather than sending the owner into the
playlist first, which is the one place this set leaves the spec's out-of-scope line. The owner-only rule is
unchanged. The picker's level buttons are also a decision: accounts that already hold the playlist appear with
their level selected, so one picker both grants and changes a level.

| Ticket                                                                | Status   | Blocked by                                | Blocks                                 |
| --------------------------------------------------------------------- | -------- | ----------------------------------------- | -------------------------------------- |
| [`01-the-share-list-and-a-revoke`](01-the-share-list-and-a-revoke.md) | resolved | none                                      | [`02`](02-grant-and-change-a-level.md) |
| [`02-grant-and-change-a-level`](02-grant-and-change-a-level.md)       | resolved | [`01`](01-the-share-list-and-a-revoke.md) | [`03`](03-the-share-journey.md)        |
| [`03-the-share-journey`](03-the-share-journey.md)                     | resolved | [`02`](02-grant-and-change-a-level.md)    | none                                   |
