# 106: The mobile UI still misses its contract

**State:** `open`
**Category:** `bug`

## What the audit found

A second source audit of `apps/mobile` on 2026-11-03 scored the UI **14/20 (Good)**: 0 P0, 2 P1, 6 P2, 5 P3.
The audit ran against the Android build on the emulator (1080x2400, 420 dpi) at font scales 1.0, 1.3 and 2.0.
It follows [105](105-the-mobile-apps-ui-misses-its-contract.md), which stays open.

| Dimension              | Score | Key finding                                             |
| ---------------------- | ----- | ------------------------------------------------------- |
| Accessibility          | 2     | Every track row is announced twice by the screen reader |
| Performance            | 3     | The gallery renders up to 200 cards in a `ScrollView`   |
| Appearance and theming | 4     | Semantic tokens throughout; the contrast floors hold    |
| Platform conformance   | 3     | 44dp targets, where Android requires 48dp               |
| Adaptivity             | 2     | Font scale 2.0 overlaps the card metadata               |
| **Total**              | 14/20 | **Good**                                                |

The app reads as native: system back, edge-to-edge insets, modal sheets, a media notification and a content-driven
player bar. The scale-and-dim press replaces the ripple by decision. The remaining gaps are the screen reader's
duplicate reading, the 48dp rule, the clipped gallery chip, the unvirtualized grid and the 2.0 layout.

## Findings

P1:

1. The track row is announced twice: the play label plus the visible title, state and duration.
2. Every control is 44dp, where Android requires 48dp.

P2:

1. The gallery's selected status chip is clipped at rest.
2. The gallery renders up to 200 cards in a `ScrollView`.
3. The player bar's swipe uses a 260ms literal and a custom curve.
4. Font scale 2.0 overlaps the card metadata and truncates track titles.
5. The action dial's label is not tappable; only the icon is.
6. The share picker's only footer button says "Cancel" but applies the grant immediately.

P3:

1. The actions sheet draws two rules when there are no actions.
2. `useReduceMotion` starts false.
3. The action dial's label duplicates the button's accessibility node.
4. Decorative avatars and sign-in sleeves are announced.
5. The detail sheet likely enters twice.

## Work

The tickets are in [`mobile-ui-audit-2/TICKETS.md`](../tasks/mobile-ui-audit-2/TICKETS.md). Ticket 07 covers both
dial findings, so the set is 12 tickets. This issue stays open until every ticket resolves.
