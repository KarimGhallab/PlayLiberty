# Issues

Reviewed issues from critiques and audits. The board and its conventions live here; the issues themselves live in this folder as sibling files.

## Tracker

Work is tracked as local markdown under `docs/tracker/`. The engineering skills read and write issue files in this folder directly; there is no external issue tracker.

- **Tracker**: local markdown (`docs/tracker/issues/`).
- **PRs as a request surface**: off. Flip this on to let external pull requests enter the triage queue; leave it off otherwise.

## Board

| State      | Meaning                               |
| ---------- | ------------------------------------- |
| `open`     | Acknowledged, not yet triaged         |
| `triaged`  | Carrying exactly one state role label |
| `resolved` | Closed with the outcome recorded      |

## Issues

| Issue                                                                                                                               | State      | Category      | Summary                                                                                                                     |
| ----------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------------- | --------------------------------------------------------------------------------------------------------------------------- |
| [`01-silent-failures-and-live-sync-progress`](01-silent-failures-and-live-sync-progress.md)                                         | `resolved` | `bug`         | A failed sync explains nothing on screen, and a running sync shows nothing moving.                                          |
| [`02-the-shuffle-control-reports-the-wrong-state`](02-the-shuffle-control-reports-the-wrong-state.md)                               | `resolved` | `bug`         | Shuffle reports pressed on every playlist, not the one playing.                                                             |
| [`03-the-library-cannot-recover-from-a-failed-read`](03-the-library-cannot-recover-from-a-failed-read.md)                           | `resolved` | `bug`         | A failed read is a dead end with no retry or detail, across the library, the detail and the share dialog.                   |
| [`04-the-delete-toast-denies-the-row-it-is-deleting`](04-the-delete-toast-denies-the-row-it-is-deleting.md)                         | `resolved` | `bug`         | A deferred delete leaves its row fully live while the toast claims it is going.                                             |
| [`05-a-dead-cover-leaves-an-empty-box`](05-a-dead-cover-leaves-an-empty-box.md)                                                     | `resolved` | `bug`         | A dead cover falls back to the sleeve; the cover is the first track's stored thumbnail.                                     |
| [`06-the-row-hides-its-door-and-the-lock-its-meaning`](06-the-row-hides-its-door-and-the-lock-its-meaning.md)                       | `resolved` | `enhancement` | The share tooltip is hover-only; make it focusable, Escape-dismissible and persistent.                                      |
| [`07-make-the-library-read-as-a-personal-gallery`](07-make-the-library-read-as-a-personal-gallery.md)                               | `resolved` | `enhancement` | Rows carry their cover as a blurred ground, the playing playlist shows the bars, and the empty state offers one invitation. |
| [`08-animate-the-player-bar-fill-with-transform`](08-animate-the-player-bar-fill-with-transform.md)                                 | `resolved` | `enhancement` | `transition: width` on the scrub fill forces layout.                                                                        |
| [`09-the-playlist-detail-header-takes-its-covers-colour`](09-the-playlist-detail-header-takes-its-covers-colour.md)                 | `resolved` | `enhancement` | The detail header card takes its colour from its own cover, the counterpart of the library's row ground.                    |
| [`10-one-artwork-pipeline-the-cover-reuses-the-tracks-thumbnail`](10-one-artwork-pipeline-the-cover-reuses-the-tracks-thumbnail.md) | `resolved` | `enhancement` | The cover reuses the first track's stored thumbnail; no third-party URL, and a derivative for the ambience.                 |
| [`11-the-detail-header-loses-the-playlist-name-on-a-phone`](11-the-detail-header-loses-the-playlist-name-on-a-phone.md)             | `resolved` | `bug`         | At 390, the detail header's name collapses to about one character when the transport is shown.                              |
| [`12-the-player-seeker-and-the-volume-rail-fail-touch`](12-the-player-seeker-and-the-volume-rail-fail-touch.md)                     | `resolved` | `bug`         | The seeker is a 4px-tall target and the volume rail is hover-only, so touch cannot seek or set a level.                     |
| [`13-artwork-loads-eagerly-at-full-resolution`](13-artwork-loads-eagerly-at-full-resolution.md)                                     | `resolved` | `enhancement` | Every cover loads eagerly at full resolution; a long playlist fetches and decodes one full image per track.                 |
| [`14-the-playing-mark-announces-playing-while-paused`](14-the-playing-mark-announces-playing-while-paused.md)                       | `resolved` | `bug`         | The equalizer mark says "Playing" even when the queue is paused.                                                            |
| [`15-the-track-list-re-renders-wholesale-on-every-queue-change`](15-the-track-list-re-renders-wholesale-on-every-queue-change.md)   | `resolved` | `enhancement` | Nothing is memoized and the row callbacks are inline, so a queue change re-renders the whole list.                          |
| [`16-one-owner-for-the-playlist-actions`](16-one-owner-for-the-playlist-actions.md)                                                 | `resolved` | `enhancement` | The playlist actions are wired once per consumer and the owner/writer rule is derived in the header and again at each page.  |
| [`17-split-the-playlist-header-into-a-row-and-a-card`](17-split-the-playlist-header-into-a-row-and-a-card.md)                       | `resolved` | `enhancement` | One `arrangement` prop selects between two header bodies, and the interface carries props only one body honours.             |
| [`18-one-owner-for-the-track-lifecycle`](18-one-owner-for-the-track-lifecycle.md)                                                   | `triaged`  | `enhancement` | Six modules write the track state columns inline; the state machine is recoverable only by reading all six.                  |
| [`19-one-cache-effect-map`](19-one-cache-effect-map.md)                                                                             | `triaged`  | `enhancement` | The invalidation keys are restated per mutation and per live event, and a playlist removal takes two different primitives.  |
| [`20-reconnect-the-players-refetch-seam`](20-reconnect-the-players-refetch-seam.md)                                                 | `triaged`  | `enhancement` | The refetch seam is dead, so a sync never merges into the live queue, and queue construction is spread across four files.   |
| [`21-one-problem-code-contract`](21-one-problem-code-contract.md)                                                                   | `triaged`  | `enhancement` | The server problem codes and the client mapping are two hand-kept lists; the `ApiError` unwrap is repeated at four sites.    |
| [`22-make-access-a-seam-the-entry-point-cannot-skip`](22-make-access-a-seam-the-entry-point-cannot-skip.md)                         | `triaged`  | `enhancement` | Eleven service entry points hand-write the same access guard, and the two access modules encode the outcome two ways.       |
| [`23-the-origin-refuses-anything-that-did-not-come-through-the-edge`](23-the-origin-refuses-anything-that-did-not-come-through-the-edge.md) | `triaged` | `bug` | The origin believes any request that can reach the port; make it refuse anything that did not come through the edge. |
| [`24-a-share-never-carries-the-collaborators-email-or-role`](24-a-share-never-carries-the-collaborators-email-or-role.md) | `triaged` | `bug` | A share exposes every collaborator's email and admin role; return the summary shape. |
| [`25-the-thumbnail-fetch-cannot-be-pointed-off-the-image-hosts`](25-the-thumbnail-fetch-cannot-be-pointed-off-the-image-hosts.md) | `triaged` | `bug` | The thumbnail fetch follows any URL from yt-dlp metadata; pin it to the image hosts and bound it. |
| [`26-a-source-entry-id-that-is-not-a-video-id-never-reaches-the-filesystem`](26-a-source-entry-id-that-is-not-a-video-id-never-reaches-the-filesystem.md) | `triaged` | `bug` | An unvalidated yt-dlp entry id can escape the media root; reject it and assert containment. |
| [`27-refused-requests-and-access-control-changes-are-recorded`](27-refused-requests-and-access-control-changes-are-recorded.md) | `triaged` | `enhancement` | Refused requests and access-control changes leave no audit line. |
| [`28-a-track-change-tells-a-listener-only-about-playlists-it-can-see`](28-a-track-change-tells-a-listener-only-about-playlists-it-can-see.md) | `triaged` | `bug` | A track change leaks the ids of playlists a listener cannot see. |
| [`29-the-public-origin-sends-its-security-headers`](29-the-public-origin-sends-its-security-headers.md) | `triaged` | `enhancement` | The public origin sends no security headers. |
| [`30-the-image-trusts-a-committed-digest-not-the-download-channel`](30-the-image-trusts-a-committed-digest-not-the-download-channel.md) | `triaged` | `bug` | The image verifies yt-dlp against a checksum from the same channel; trust a committed digest. |
| [`31-the-web-origin-has-no-production-deployment`](31-the-web-origin-has-no-production-deployment.md) | `triaged` | `bug` | `deploy/` ships only the server; add the nginx front and keep the backend off the edge network. |

## Conventions

- One file per issue, named `NN-slug.md`, numbered in creation order.
- Every issue carries exactly one state role and at most one category role, per `docs/TRIAGE_LABEL.md`.
- The issue states the observed behaviour, the expected behaviour, and the evidence (a repro, a command, a screenshot).
