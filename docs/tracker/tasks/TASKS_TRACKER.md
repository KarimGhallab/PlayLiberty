# Tasks

Actionable tickets with blocking edges, written by `/to-tickets`. One file per ticket, named `NN-slug.md` and numbered in creation order.

## Tickets

| Ticket                                                                                                                      | State    | Blocked by                                               | Blocks                                                    |
| --------------------------------------------------------------------------------------------------------------------------- | -------- | -------------------------------------------------------- | --------------------------------------------------------- |
| [`01-define-server-stack`](01-define-server-stack.md)                                                                       | resolved | none                                                     | none                                                      |
| [`02-define-web-stack`](02-define-web-stack.md)                                                                             | resolved | none                                                     | none                                                      |
| [`03-define-mobile-stack`](03-define-mobile-stack.md)                                                                       | resolved | none                                                     | none                                                      |
| [`04-scaffold-server`](04-scaffold-server.md)                                                                               | resolved | none                                                     | none                                                      |
| [`05-scaffold-web`](05-scaffold-web.md)                                                                                     | resolved | none                                                     | none                                                      |
| [`06-scaffold-mobile`](06-scaffold-mobile.md)                                                                               | resolved | none                                                     | [`07`](07-provision-mobile-access.md)                     |
| [`07-provision-mobile-access`](07-provision-mobile-access.md)                                                               | resolved | [`06`](06-scaffold-mobile.md)                            | none                                                      |
| [`08-define-design-system`](08-define-design-system.md)                                                                     | resolved | none                                                     | [`09`](09-design-scheme-and-components.md)                |
| [`09-design-scheme-and-components`](09-design-scheme-and-components.md)                                                     | resolved | none                                                     | [`10`](10-build-design-foundation.md)                     |
| [`10-build-design-foundation`](10-build-design-foundation.md)                                                               | resolved | [`09`](09-design-scheme-and-components.md)               | [`05`](05-scaffold-web.md), [`06`](06-scaffold-mobile.md) |
| [`11-form-controls`](11-form-controls.md)                                                                                   | resolved | none                                                     | none                                                      |
| [`12-rename-refresh-route-to-sync`](12-rename-refresh-route-to-sync.md)                                                     | resolved | none                                                     | none                                                      |
| [`13-settle-the-screen-inventory`](13-settle-the-screen-inventory.md)                                                       | resolved | none                                                     | none                                                      |
| [`14-expose-the-last-sync-run`](14-expose-the-last-sync-run.md)                                                             | resolved | none                                                     | none                                                      |
| [`15-add-track-count-to-playlists`](15-add-track-count-to-playlists.md)                                                     | resolved | none                                                     | none                                                      |
| [`16-design-the-library`](16-design-the-library.md)                                                                         | resolved | none                                                     | none                                                      |
| [`17-design-the-playlist-detail`](17-design-the-playlist-detail.md)                                                         | resolved | none                                                     | none                                                      |
| [`18-expose-playlist-access`](18-expose-playlist-access.md)                                                                 | resolved | none                                                     | none                                                      |
| [`19-record-the-items-deliberate-actions`](19-record-the-items-deliberate-actions.md)                                       | resolved | none                                                     | none                                                      |
| [`20-context-the-row-controls-and-trap-focus`](20-context-the-row-controls-and-trap-focus.md)                               | resolved | none                                                     | none                                                      |
| [`21-harden-the-library-edges`](21-harden-the-library-edges.md)                                                             | resolved | none                                                     | none                                                      |
| [`22-settle-the-narrow-width-and-refusal-copy`](22-settle-the-narrow-width-and-refusal-copy.md)                             | resolved | none                                                     | none                                                      |
| [`23-polish-the-library-after-the-fixes`](23-polish-the-library-after-the-fixes.md)                                         | resolved | none                                                     | none                                                      |
| [`24-add-a-track-to-the-web-client`](04-curate-a-playlist/WEB_TICKETS.md)                                                   | resolved | none                                                     | none                                                      |
| [`24-shuffle-starts-playback-and-the-list-mirrors-the-queue`](24-shuffle-starts-playback-and-the-list-mirrors-the-queue.md) | resolved | none                                                     | none                                                      |
| [`25-skip-non-music-parts`](10-skip-non-music-parts/TICKETS.md)                                                             | resolved | none                                                     | none                                                      |
| [`26-keep-the-screens-current`](09-keep-the-screens-current/TICKETS.md)                                                     | resolved | none                                                     | none                                                      |
| [`27-choose-a-language`](11-choose-a-language/TICKETS.md)                                                                   | resolved | none                                                     | none                                                      |
| [`28-guard-the-sync-failure-reason`](28-guard-the-sync-failure-reason.md)                                                   | resolved | none                                                     | none                                                      |
| [`29-sort-and-filter-the-track-list`](12-sort-and-filter-the-track-list/TICKETS.md)                                         | resolved | none                                                     | none                                                      |
| [`30-the-library-as-a-gallery-of-tiles`](30-the-library-as-a-gallery-of-tiles.md)                                           | resolved | none                                                     | none                                                      |
| [`31-the-library-at-phone-width-is-a-card-grid`](31-the-library-at-phone-width-is-a-card-grid.md)                           | resolved | none                                                     | none                                                      |
| [`32-pin-a-playlist`](13-pin-a-playlist/TICKETS.md)                                                                         | resolved | none                                                     | none                                                      |
| [`33-the-touch-targets-and-the-phone-width`](33-the-touch-targets-and-the-phone-width.md)                                   | resolved | none                                                     | none                                                      |
| [`34-one-playlist-read-projection`](34-one-playlist-read-projection.md)                                                     | resolved | none                                                     | none                                                      |
| [`35-one-endpoint-table-both-sides-read`](35-one-endpoint-table-both-sides-read.md)                                         | resolved | none                                                     | none                                                      |
| [`36-one-access-rule-one-module`](36-one-access-rule-one-module.md)                                                         | resolved | none                                                     | none                                                      |
| [`37-one-playable-rule`](37-one-playable-rule.md)                                                                           | resolved | none                                                     | none                                                      |
| [`38-playlist-actions-once-per-page`](38-playlist-actions-once-per-page.md)                                                 | resolved | none                                                     | none                                                      |
| [`39-one-owner-for-seek`](39-one-owner-for-seek.md)                                                                         | resolved | none                                                     | none                                                      |
| [`40-upload-a-playlist-cover`](14-upload-a-playlist-cover/TICKETS.md)                                                       | resolved | none                                                     | none                                                      |
| [`41-prepare-the-production-deployment`](15-prepare-the-production-deployment/TICKETS.md)                                   | resolved | none                                                     | none                                                      |
| [`42-crop-a-playlist-cover`](17-crop-a-playlist-cover/TICKETS.md)                                                           | resolved | none                                                     | none                                                      |
| [`43-tunnel-the-youtube-egress`](16-tunnel-the-youtube-egress/TICKETS.md)                                                   | resolved | none                                                     | none                                                      |
| [`44-one-meaning-for-a-failed-source-read`](44-one-meaning-for-a-failed-source-read.md)                                     | resolved | none                                                     | none                                                      |
| [`45-one-owner-for-the-agent-exchange`](45-one-owner-for-the-agent-exchange.md)                                             | resolved | none                                                     | none                                                      |
| [`46-one-responder-for-a-refusal`](46-one-responder-for-a-refusal.md)                                                       | resolved | none                                                     | [`47`](47-the-remaining-refusals-and-the-old-outcomes.md) |
| [`47-the-remaining-refusals-and-the-old-outcomes`](47-the-remaining-refusals-and-the-old-outcomes.md)                       | resolved | [`46`](46-one-responder-for-a-refusal.md)                | none                                                      |
| [`48-one-optimistic-frame-and-a-playlist-client`](48-one-optimistic-frame-and-a-playlist-client.md)                         | resolved | none                                                     | [`49`](49-clients-for-the-library-account-and-egress.md)  |
| [`49-clients-for-the-library-account-and-egress`](49-clients-for-the-library-account-and-egress.md)                         | resolved | [`48`](48-one-optimistic-frame-and-a-playlist-client.md) | none                                                      |
| [`50-share-a-track`](18-share-a-track/TICKETS.md)                                                                           | resolved | none                                                     | none                                                      |
| [`51-the-e2e-projects-own-their-suites`](51-the-e2e-projects-own-their-suites.md)                                           | resolved | none                                                     | none                                                      |

Tickets `06` and `07` scaffolded the mobile app and provisioned its access. The rest of spec
[`19`](../specs/19-the-mobile-shell.md) is in [`19-the-mobile-shell/TICKETS.md`](19-the-mobile-shell/TICKETS.md),
and `07` is the implementation record of spec [`20`](../specs/20-provision-mobile-access.md); the remaining tickets
are in [`20-provision-mobile-access/TICKETS.md`](20-provision-mobile-access/TICKETS.md).

Feature-scoped ticket sets live in a folder named for their spec or their audit:

- [`01-sync-a-playlist/TICKETS.md`](01-sync-a-playlist/TICKETS.md)
- [`02-store-a-track/TICKETS.md`](02-store-a-track/TICKETS.md)
- [`03-read-a-playlist/TICKETS.md`](03-read-a-playlist/TICKETS.md)
- [`04-curate-a-playlist/TICKETS.md`](04-curate-a-playlist/TICKETS.md) with its web half in [`04-curate-a-playlist/WEB_TICKETS.md`](04-curate-a-playlist/WEB_TICKETS.md)
- [`05-share-a-playlist/TICKETS.md`](05-share-a-playlist/TICKETS.md)
- [`06-prune-orphans/TICKETS.md`](06-prune-orphans/TICKETS.md)
- [`07-play-stored-audio/TICKETS.md`](07-play-stored-audio/TICKETS.md)
- [`08-see-the-library/TICKETS.md`](08-see-the-library/TICKETS.md)
- [`10-skip-non-music-parts/TICKETS.md`](10-skip-non-music-parts/TICKETS.md)
- [`09-keep-the-screens-current/TICKETS.md`](09-keep-the-screens-current/TICKETS.md)
- [`11-choose-a-language/TICKETS.md`](11-choose-a-language/TICKETS.md)
- [`12-sort-and-filter-the-track-list/TICKETS.md`](12-sort-and-filter-the-track-list/TICKETS.md)
- [`13-pin-a-playlist/TICKETS.md`](13-pin-a-playlist/TICKETS.md)
- [`14-upload-a-playlist-cover/TICKETS.md`](14-upload-a-playlist-cover/TICKETS.md).
- [`15-prepare-the-production-deployment/TICKETS.md`](15-prepare-the-production-deployment/TICKETS.md).
- [`17-crop-a-playlist-cover/TICKETS.md`](17-crop-a-playlist-cover/TICKETS.md).
- [`16-tunnel-the-youtube-egress/TICKETS.md`](16-tunnel-the-youtube-egress/TICKETS.md).
- [`18-share-a-track/TICKETS.md`](18-share-a-track/TICKETS.md).
- [`19-the-mobile-shell/TICKETS.md`](19-the-mobile-shell/TICKETS.md).
- [`20-provision-mobile-access/TICKETS.md`](20-provision-mobile-access/TICKETS.md).
- [`21-see-the-library/TICKETS.md`](21-see-the-library/TICKETS.md).
- [`22-read-a-playlist/TICKETS.md`](22-read-a-playlist/TICKETS.md).
- [`23-play-stored-audio/TICKETS.md`](23-play-stored-audio/TICKETS.md).
- [`24-play-in-the-background/TICKETS.md`](24-play-in-the-background/TICKETS.md).
- [`25-curate-a-playlist/TICKETS.md`](25-curate-a-playlist/TICKETS.md).
- [`26-share-a-playlist/TICKETS.md`](26-share-a-playlist/TICKETS.md).
- [`27-sort-and-filter-the-track-list/TICKETS.md`](27-sort-and-filter-the-track-list/TICKETS.md).
- [`28-pin-a-playlist/TICKETS.md`](28-pin-a-playlist/TICKETS.md).
- [`29-set-a-playlist-cover/TICKETS.md`](29-set-a-playlist-cover/TICKETS.md).
- [`30-share-a-track/TICKETS.md`](30-share-a-track/TICKETS.md).
- [`31-manage-the-egress/TICKETS.md`](31-manage-the-egress/TICKETS.md).
- [`32-release-the-android-app/TICKETS.md`](32-release-the-android-app/TICKETS.md): the signed release, the install and
  update paths, and the on-device checklist, from spec [`32`](../specs/32-release-the-android-app.md).
- [`33-refresh-mobile-access/TICKETS.md`](33-refresh-mobile-access/TICKETS.md).
- [`34-cancel-a-sync/TICKETS.md`](34-cancel-a-sync/TICKETS.md): the boot recovery and the cancel control, from spec
  [`34`](../specs/34-cancel-a-sync.md).
- [`mobile-ui-audit-1/TICKETS.md`](mobile-ui-audit-1/TICKETS.md): the mobile UI audit's 19 tickets, from issue
  [`105`](../issues/105-the-mobile-apps-ui-misses-its-contract.md).
- [`mobile-ui-audit-2/TICKETS.md`](mobile-ui-audit-2/TICKETS.md): the second mobile UI audit's 12 tickets, from issue
  [`106`](../issues/106-the-mobile-ui-still-misses-its-contract.md).
- [`mobile-ui-audit-3/TICKETS.md`](mobile-ui-audit-3/TICKETS.md): the third mobile UI audit's 5 tickets, from issue
  [`107`](../issues/107-five-gaps-remain-in-the-mobile-ui.md).
- [`mobile-ui-critique-1/TICKETS.md`](mobile-ui-critique-1/TICKETS.md): the first mobile design critique's 18 tickets,
  from issue [`108`](../issues/108-a-design-critique-scores-the-mobile-app-26-40.md).
- [`removed-source-view/TICKETS.md`](removed-source-view/TICKETS.md): the retained view in the track filter's 3 tickets,
  from issue [`109`](../issues/109-the-filter-cannot-show-the-tracks-a-removal-left-behind.md).
- [`mobile-ui-critique-2/TICKETS.md`](mobile-ui-critique-2/TICKETS.md): the second mobile design critique's 19 tickets,
  from issue [`123`](../issues/123-a-second-design-critique-scores-the-mobile-app-26-40.md).
- [`shared-client-modules/TICKETS.md`](shared-client-modules/TICKETS.md): the cross-client duplication review's 8
  tickets, from the architecture review of 3 November 2026.
- [`mobile-architecture-review/TICKETS.md`](mobile-architecture-review/TICKETS.md): the mobile architecture review's
  3 tickets, from the review of 8 November 2026.
- [`security-review-2026-11-09/TICKETS.md`](security-review-2026-11-09/TICKETS.md): the security review's
  refresh-rotation and revocation tickets, findings 4, 5 and 6.

## Conventions

- One file per ticket, named `NN-slug.md`, numbered in creation order.
- The table above links every ticket reference to its file, so a reader lands on the ticket from any row.
- Each ticket declares its blocking edges: which tickets must land before it can start. A ticket with no edges can start immediately.
- Each ticket is a tracer bullet: it reaches a working end state on its own, however thin, rather than being a layer of a larger change.
- A ticket ends with its verification while it is open: the command or check that proves it is done. A resolved ticket records its outcome and a pointer instead.
- Resolve a ticket by recording the outcome in the ticket, then updating its row here. Do not delete it.
