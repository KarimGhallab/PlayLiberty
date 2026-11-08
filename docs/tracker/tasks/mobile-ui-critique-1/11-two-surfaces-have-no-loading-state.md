# 11: The account sheet and the bare track have no loading state

**Status:** resolved
**Labels:** `bug`, `ready-for-agent`
**Source:** [A design critique scores the mobile app 26/40](../../issues/108-a-design-critique-scores-the-mobile-app-26-40.md)

## Outcome

`AccountSheet` gained a `loading` prop, fed by `useAccount(...).isPending` in `LibraryShell`. While the account read has no
value, the identity block is a 48dp row: a 48dp avatar shape and two text lines inside one accessible node labelled
"Loading the account." with a live region. The loaded row is the same 48dp tall, from the same avatar box, so the sheet
does not resize when the name arrives. A failed read still draws no identity block.

The bare track route renders `BareTrackLoading` while `useTrack` is pending and the session is signed in. It holds the
player bar's slot at the bar's resting height and inset, with an artwork square and two lines, as one accessible node
labelled "Opening the track." The placeholder is not interactive and does not block the gallery. It yields to the real
bar, or to the notice, as soon as data or an error lands. The slot is absolute, so the rest of the page does not move.

Both labels live in the shared catalogs as `account.loading` and `trackLink.loading`, so English and French ship
together.

Tests: the account sheet covers the reserved row and the no-read fallback; the bare track covers the pending slot, the
signed-out gate, and the placeholder leaving once the track lands.
