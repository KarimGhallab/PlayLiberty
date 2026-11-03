# 107: Five gaps remain in the mobile UI

**State:** `open`
**Category:** `bug`

## What the audit found

A third source audit of `apps/mobile` on 2026-11-03 scored the UI **17/20 (Good)**: 0 P0, 0 P1, 2 P2, 3 P3.
The audit ran against the Android build on the emulator (1080x2400, 420 dpi) at font scales 1.0 and 2.0, plus a
tablet override (1600x2560 at 320 dpi, 800dp), dark theme. It follows
[105](105-the-mobile-apps-ui-misses-its-contract.md) and [106](106-the-mobile-ui-still-misses-its-contract.md), both
of which stay open.

| Dimension              | Score | Key finding                                                                                    |
| ---------------------- | ----- | ---------------------------------------------------------------------------------------------- |
| Accessibility          | 3     | Hour-long track durations wrap and clip in the player bar at font scale 2.0.                   |
| Performance            | 4     | Virtualized gallery, memoized rows, selector-scoped repaints, no jank seen.                    |
| Appearance and theming | 4     | Tokens only, no raw hex, dark theme first-class.                                               |
| Platform conformance   | 3     | Native gestures, insets and 48dp targets; custom controls and a portrait lock.                 |
| Adaptivity             | 3     | Phone and 800dp tablet work; the tablet chrome stretches, landscape is locked, the facts wrap. |
| **Total**              | 17/20 | **Good**                                                                                       |

The app reads as native: system Back and predictive back work, the insets hold, every measured control is 48dp, the
sheets raise above the keyboard, and the dark theme is first-class. The remaining gaps are the player bar's fixed time
slot, the tablet's stretched chrome, and three large-text or timing edges.

## Findings

P2:

1. The player bar's time labels are 40dp wide, so a 1:18:56 track wraps to two lines and is clipped at font scale 2.0.
2. The tablet chrome stretches the phone frame: the detail's Play and Shuffle/actions sit about 500dp apart at 800dp,
   and rows run the full width. The gallery is the exception, at three columns.

P3:

1. The egress console's two-column fact rows wrap their labels at 2.0, so "Dernière tentative" pushes "Jamais" below
   "OK".
2. The action dial's longest label starts about 4dp from the screen edge at 2.0 instead of the 16dp inset.
3. The notice auto-dismisses after four seconds with no visible dismiss control and no accessibility action; the undo
   snackbar has both.

## Work

The tickets are in [`mobile-ui-audit-3/TICKETS.md`](../tasks/mobile-ui-audit-3/TICKETS.md). Every ticket can start
immediately. This issue stays open until every ticket resolves.
