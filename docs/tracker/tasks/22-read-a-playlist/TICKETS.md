# 22: Read a playlist on mobile

Tickets for [`22-read-a-playlist`](../../specs/22-read-a-playlist.md). One file per ticket, numbered in dependency
order, each declaring its blocking edges. The shell, the gallery, the request client, the sheet frame and the player
store already exist, so these tickets carry the detail's reads, its rows, its queue start, its bands, its sheets and
its journeys.

| Ticket                                                                            | Status   | Blocked by                                                                                                                         | Blocks                                                                                                                                                                            |
| --------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`01-the-detail-reads-a-playlist`](01-the-detail-reads-a-playlist.md)             | resolved | none                                                                                                                               | [`02`](02-the-details-read-states.md), [`03`](03-the-track-rows-draw-and-play.md), [`09`](09-the-sync-band.md), [`10`](10-the-skip-setting.md), [`11`](11-the-add-track-sheet.md) |
| [`02-the-details-read-states`](02-the-details-read-states.md)                     | resolved | [`01`](01-the-detail-reads-a-playlist.md)                                                                                          | none                                                                                                                                                                              |
| [`03-the-track-rows-draw-and-play`](03-the-track-rows-draw-and-play.md)           | resolved | [`01`](01-the-detail-reads-a-playlist.md)                                                                                          | [`04`](04-the-rows-lane-and-sheet.md), [`06`](06-the-header-plays-and-shuffles.md), [`07`](07-the-list-pages-and-lands.md)                                                        |
| [`04-the-rows-lane-and-sheet`](04-the-rows-lane-and-sheet.md)                     | resolved | [`03`](03-the-track-rows-draw-and-play.md)                                                                                         | [`05`](05-removal-and-deletion-are-deferred.md)                                                                                                                                   |
| [`05-removal-and-deletion-are-deferred`](05-removal-and-deletion-are-deferred.md) | resolved | [`04`](04-the-rows-lane-and-sheet.md)                                                                                              | [`12`](12-the-detail-journeys.md)                                                                                                                                                 |
| [`06-the-header-plays-and-shuffles`](06-the-header-plays-and-shuffles.md)         | resolved | [`03`](03-the-track-rows-draw-and-play.md)                                                                                         | [`08`](08-the-sort-and-the-chips.md), [`12`](12-the-detail-journeys.md)                                                                                                           |
| [`07-the-list-pages-and-lands`](07-the-list-pages-and-lands.md)                   | resolved | [`03`](03-the-track-rows-draw-and-play.md)                                                                                         | [`08`](08-the-sort-and-the-chips.md)                                                                                                                                              |
| [`08-the-sort-and-the-chips`](08-the-sort-and-the-chips.md)                       | resolved | [`06`](06-the-header-plays-and-shuffles.md), [`07`](07-the-list-pages-and-lands.md)                                                | [`12`](12-the-detail-journeys.md)                                                                                                                                                 |
| [`09-the-sync-band`](09-the-sync-band.md)                                         | resolved | [`01`](01-the-detail-reads-a-playlist.md)                                                                                          | none                                                                                                                                                                              |
| [`10-the-skip-setting`](10-the-skip-setting.md)                                   | resolved | [`01`](01-the-detail-reads-a-playlist.md)                                                                                          | none                                                                                                                                                                              |
| [`11-the-add-track-sheet`](11-the-add-track-sheet.md)                             | resolved | [`01`](01-the-detail-reads-a-playlist.md)                                                                                          | none                                                                                                                                                                              |
| [`12-the-detail-journeys`](12-the-detail-journeys.md)                             | resolved | [`05`](05-removal-and-deletion-are-deferred.md), [`06`](06-the-header-plays-and-shuffles.md), [`08`](08-the-sort-and-the-chips.md) | none                                                                                                                                                                              |

## Conventions

- One file per ticket, numbered from `01` in dependency order, blockers first.
- A ticket with no blockers can start immediately; the frontier is every ticket whose blockers are done.
- Each ticket is a tracer bullet: a complete path through the screen and the reads it makes, demoable on its own.
- The human installs `expo-clipboard` before `04`. The repo rule bars the agent from installing packages; `04` keeps
  Copy link once the package is there.
- The player bar, queue sheet, seek and audio focus are spec `23`'s. `22` starts the queue and marks the playing row;
  it draws no transport.
- The sort and chips, the row sheet, the skip switch and the add-track sheet are spec `22`'s surfaces. Specs `27`,
  `25` and `30` still own their full behaviour and extend these controls rather than replacing the screen.
- The detail's last row pays the add action's height here and the player bar's height in `23`.
- Prior art is the web detail's page tests for `01`, `02`, `08` and `09`, the web's `TrackRow` tests for `03` and
  `04`, the web's `AddTrackDialog` tests for `11`, and the web's player tests for `06`.
- Resolve a ticket by recording its outcome in the ticket and updating its row here. Do not delete it.
