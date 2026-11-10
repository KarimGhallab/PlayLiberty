# 15: The egress facts arrive unlabelled

**Status:** resolved
**Labels:** `bug`, `ready-for-agent`
**Source:** [A design critique scores the mobile app 26/40](../../issues/108-a-design-critique-scores-the-mobile-app-26-40.md)

## Outcome

`EgressScreen` now renders each fact through one `Fact` component. The fact is a single accessible node whose label
joins the label, the value and any sentence under it with commas; the painted label, value and sub-line sit in a child
wrapper hidden from the tree, so TalkBack no longer reads six fragments per card. An empty endpoint reads "Not set"
rather than a dash.

The copy changed with it. `egress.seen` is "Provider saw {ip}" / "Le fournisseur a vu {ip}", so the observed address
no longer borrows a time preposition. The shared `egress.never` became `egress.neverAttempted` ("No attempt yet") and
`egress.neverChecked` ("Not checked yet"), and the web's `timeOf` takes the matching key so both clients keep one
copy. Catalogs are at parity and the web builds against the same keys.

On the emulator, each card's facts read as one node, for example
"Point de terminaison, 79.127.169.91:51820, Le fournisseur a vu 159.26.105.28" and
"Dernière tentative, Aucune tentative". The test asserts the eight composed names across the two cards.
