# Settle the screen inventory

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

## Outcome

The inventory is four screens, two per client: the library and the playlist detail, where a screen is a surface a user reaches by route, so each is one design task with two arrangements. The library is one list with no sections, and there is no fixed sidebar and no mobile tab bar. A `write` share permits add, remove and sync; rename, delete and share management stay with the owner. The jobs are the capabilities in [`PRODUCT.md`](../../PRODUCT.md), and the permission rule is in specs [`04`](../specs/04-curate-a-playlist.md) and [`05`](../specs/05-share-a-playlist.md).

**Revised by [`19-the-mobile-shell`](../specs/19-the-mobile-shell.md).** The mobile client has four routes, not two: the library, the playlist detail, a bare track and the egress console, plus an account sheet that is a modal and not a route. The two-route inventory was taken before the app carried its own token and before the console was in the mobile client's scope. The web client keeps its two screens, and the rule that a route exists only for a surface reached by route, rather than for a state of another route, still holds.

See [the settled arrangements](../../DESIGN.md#the-settled-arrangements).
