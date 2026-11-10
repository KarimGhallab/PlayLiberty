# mobile-ui-critique-2

Tickets for [issue 123](../../issues/123-a-second-design-critique-scores-the-mobile-app-26-40.md), the second design
critique of the mobile client. One file per ticket, numbered by severity, each declaring its blocking edges. Every
ticket is an issue ticket: it repairs or sharpens what already ships. The 26/40 report is archived at
`.impeccable/critique/2026-11-05T21-19-47Z__apps-mobile.md`.

| Ticket                                                                                                                          | Severity | Status   | Blocked by | Blocks |
| ------------------------------------------------------------------------------------------------------------------------------- | -------- | -------- | ---------- | ------ |
| [`01-the-row-cannot-tell-a-kept-track-from-a-lost-one`](01-the-row-cannot-tell-a-kept-track-from-a-lost-one.md)                 | P1       | resolved | none       | 02     |
| [`02-the-card-counts-what-cannot-be-recovered-as-missing`](02-the-card-counts-what-cannot-be-recovered-as-missing.md)           | P1       | resolved | 01         | 19     |
| [`03-the-player-bar-collides-at-200-percent-text`](03-the-player-bar-collides-at-200-percent-text.md)                           | P1       | resolved | none       | 07     |
| [`04-the-gallery-stays-focusable-behind-the-playlist-sheet`](04-the-gallery-stays-focusable-behind-the-playlist-sheet.md)       | P1       | resolved | none       | none   |
| [`05-the-status-rail-hides-its-own-selection`](05-the-status-rail-hides-its-own-selection.md)                                   | P2       | resolved | none       | none   |
| [`06-the-compact-header-slices-its-list-and-loses-the-owner`](06-the-compact-header-slices-its-list-and-loses-the-owner.md)     | P2       | resolved | none       | none   |
| [`07-a-track-title-is-one-line`](07-a-track-title-is-one-line.md)                                                               | P2       | resolved | 03         | none   |
| [`08-the-floating-add-covers-the-rows-lane`](08-the-floating-add-covers-the-rows-lane.md)                                       | P2       | resolved | none       | none   |
| [`09-reduced-motion-still-translates-two-panels`](09-reduced-motion-still-translates-two-panels.md)                             | P2       | resolved | none       | none   |
| [`10-the-add-sheet-mounts-every-writable-playlist`](10-the-add-sheet-mounts-every-writable-playlist.md)                         | P2       | resolved | none       | none   |
| [`11-the-cards-overlaid-controls-are-still-clickable-nodes`](11-the-cards-overlaid-controls-are-still-clickable-nodes.md)       | P2       | resolved | none       | none   |
| [`12-the-player-bar-names-nothing-about-the-queue`](12-the-player-bar-names-nothing-about-the-queue.md)                         | P3       | resolved | none       | none   |
| [`13-the-library-shows-its-scrollbar-and-the-detail-hides-it`](13-the-library-shows-its-scrollbar-and-the-detail-hides-it.md)   | P3       | resolved | none       | none   |
| [`14-the-pinned-card-is-narrower-than-the-grid`](14-the-pinned-card-is-narrower-than-the-grid.md)                               | P3       | resolved | none       | none   |
| [`15-sync-all-7-explains-nothing-beside-all-11`](15-sync-all-7-explains-nothing-beside-all-11.md)                               | P3       | resolved | none       | none   |
| [`16-the-first-track-cover-fallback-has-no-cache-version`](16-the-first-track-cover-fallback-has-no-cache-version.md)           | P3       | resolved | none       | none   |
| [`17-the-egress-card-says-ok-beside-no-attempt`](17-the-egress-card-says-ok-beside-no-attempt.md)                               | P3       | resolved | none       | none   |
| [`18-covers-request-no-decode-size`](18-covers-request-no-decode-size.md)                                                       | P3       | resolved | none       | none   |
| [`19-the-web-card-still-counts-terminal-tracks-as-downloading`](19-the-web-card-still-counts-terminal-tracks-as-downloading.md) | P2       | resolved | 02         | none   |

## Conventions

- One file per ticket, numbered by severity; every ticket without a blocker can start immediately.
- `01` is the one product decision in the set: the user chose to change the DESIGN.md rule that a removed source takes
  the removed word whatever the file says, which supersedes the ambiguity accepted by
  [issue 109](../../issues/109-the-filter-cannot-show-the-tracks-a-removal-left-behind.md). "One word per track state"
  ([issue 84](../../issues/84-one-word-per-track-state.md)) still holds, now one word per axis.
- `02` waits on `01` because the terminal line and the card's name must use the two-axis vocabulary.
- `07` waits on `03` because both touch the row's line height and cap.
- `11` is `ready-for-human`: it needs TalkBack enabled, and the earlier verification's claim does not reproduce on this
  build.
- `19` was split out of `02` on 2026-11-06: the mobile card and the shared reassurance were fixed there, while the web
  gallery badge carries the same policy and needs its own pass.
- The shell is settled. No ticket here redesigns the grid, the dial, the bar or the sheets; the direction recorded on
  issue 123 is "keep the shell, make the state legible".
- Resolve a ticket by recording the outcome in the ticket and updating its row here. Do not delete it.
