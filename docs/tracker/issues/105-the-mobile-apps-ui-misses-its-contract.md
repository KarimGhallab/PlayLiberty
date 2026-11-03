# 105: The mobile app's UI misses its contract

**State:** `open`
**Category:** `bug`

## What the audit found

A source audit of `apps/mobile` on 2026-11-02 scored the UI **11/20 (Acceptable)**: 0 P0, 6 P1, 9 P2, 7 P3.
Android is the stated runtime; iOS-only findings are scoped as such. No device run was performed, so gesture,
clipping and contrast claims come from the source and from computed token ratios.

| Dimension              | Score | Key finding                                                                                      |
| ---------------------- | ----- | ------------------------------------------------------------------------------------------------ |
| Accessibility          | 2     | Player bar meta text at 2.5:1 over a bright cover; six controls below 44pt; bar clips at scale 2 |
| Performance            | 2     | Track list unvirtualized; player bar re-renders on every position tick; JS-driver animations     |
| Appearance and theming | 3     | Colours and type sizes tokenized; 61 literal weights and off-scale spacing literals              |
| Platform conformance   | 2     | No back affordance on pushed screens; custom switch and checkbox; predictive back blocked        |
| Adaptivity             | 2     | Two columns at every width; portrait locked; no tablet or foldable treatment                     |

The persistent surfaces are the weakest: the player bar and the detail header are the only text drawn over arbitrary
artwork, and both fail contrast and text scaling there. Everything drawn on a token ground measures correctly.

## Findings

P1:

1. Player bar text fails contrast over cover art (2.61:1 muted, 2.47:1 accent).
2. Player bar clips at large font scale.
3. The track list is not virtualized.
4. The detail has no back affordance, and the system back gesture is disabled.
5. Six controls miss the 44pt target, including the seek rail at 32pt.
6. Sheet bodies have no scroll region, so tall sheets overflow the 90% cap.

P2:

1. The detail's failed-state word measures 4.17:1 on the cover backdrop.
2. Selection groups use the wrong roles.
3. Share controls are unnamed.
4. Sheets have no explicit dismiss control for assistive tech.
5. No iOS announcement path for status changes.
6. Off-platform controls where the platform has one.
7. Predictive back is blocked.
8. The gallery is two columns at every width.
9. The player bar re-renders its whole tree on every position tick.
10. Two animations run on the JS thread, one of them on layout.
11. A destructive action's only recovery is a 6-second window that cannot be extended.
12. The gallery's add dial is disabled while any playlist syncs.

P3:

1. Weights and off-scale literals bypass the token module.
2. A Unicode arrow stands in for an icon.
3. A coloured 2px left border on failure callouts.
4. `NotFound`'s label falls back to the system face.
5. The queue sheet is promised by the design and does not exist.
6. A prototype route ships in the app.
7. Toasts are inset differently on the two screens.

## Work

The tickets are in [`mobile-ui-audit-1/TICKETS.md`](../tasks/mobile-ui-audit-1/TICKETS.md). This issue stays open
until every ticket resolves.
