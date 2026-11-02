# mobile-ui-audit-1

Tickets for [issue 105](../../issues/105-the-mobile-apps-ui-misses-its-contract.md), the mobile UI audit. One file per
ticket, numbered in dependency order, each declaring its blocking edges. Every ticket is an issue ticket: it repairs
what already ships.

| Ticket                                                                                                  | Status | Blocked by    | Blocks |
| ------------------------------------------------------------------------------------------------------- | ------ | ------------- | ------ |
| [`01-text-over-artwork-is-contrast-safe`](01-text-over-artwork-is-contrast-safe.md)                     | ready  | none          | 17     |
| [`02-the-player-bar-grows-with-large-text`](02-the-player-bar-grows-with-large-text.md)                 | ready  | none          | 17     |
| [`03-the-track-list-is-virtualized`](03-the-track-list-is-virtualized.md)                               | ready  | none          | 17     |
| [`04-pushed-screens-have-a-back-control`](04-pushed-screens-have-a-back-control.md)                     | ready  | none          | 17     |
| [`05-every-control-meets-the-44pt-target`](05-every-control-meets-the-44pt-target.md)                   | ready  | none          | 17     |
| [`06-the-sheet-frame-scrolls-and-closes`](06-the-sheet-frame-scrolls-and-closes.md)                     | ready  | none          | 17     |
| [`07-single-choice-groups-announce-as-radios`](07-single-choice-groups-announce-as-radios.md)           | ready  | none          | 17     |
| [`08-share-controls-name-the-account`](08-share-controls-name-the-account.md)                           | ready  | none          | 17     |
| [`09-status-changes-announce-on-ios`](09-status-changes-announce-on-ios.md)                             | ready  | none          | 17     |
| [`10-press-and-toggle-feedback-match-the-platform`](10-press-and-toggle-feedback-match-the-platform.md) | ready  | none          | 17     |
| [`11-predictive-back-is-not-swallowed`](11-predictive-back-is-not-swallowed.md)                         | ready  | none          | 17     |
| [`12-the-gallery-grid-follows-the-window-width`](12-the-gallery-grid-follows-the-window-width.md)       | ready  | none          | 17     |
| [`13-the-player-bar-isolates-the-position-tick`](13-the-player-bar-isolates-the-position-tick.md)       | ready  | none          | 17     |
| [`14-animations-run-on-the-native-driver`](14-animations-run-on-the-native-driver.md)                   | ready  | none          | 17     |
| [`15-the-undo-window-can-be-extended`](15-the-undo-window-can-be-extended.md)                           | ready  | none          | 17     |
| [`16-the-add-dial-stays-live-during-a-sync`](16-the-add-dial-stays-live-during-a-sync.md)               | ready  | none          | 17     |
| [`17-type-and-spacing-return-to-the-token-module`](17-type-and-spacing-return-to-the-token-module.md)   | ready  | 01 through 16 | none   |
| [`18-small-surface-drift-returns-to-the-system`](18-small-surface-drift-returns-to-the-system.md)       | ready  | none          | none   |
| [`19-the-unshipped-surfaces-leave`](19-the-unshipped-surfaces-leave.md)                                 | ready  | none          | none   |

## Conventions

- One file per ticket, numbered in dependency order, blockers first.
- A ticket with no blockers can start immediately.
- `17` sweeps the literals the fix tickets introduce, so it runs last.
- Resolve a ticket by recording its outcome in the ticket and updating its row here. Do not delete it.
