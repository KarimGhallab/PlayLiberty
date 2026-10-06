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

## Conventions

- One file per issue, named `NN-slug.md`, numbered in creation order.
- Every issue carries exactly one state role and at most one category role, per `docs/TRIAGE_LABEL.md`.
- The issue states the observed behaviour, the expected behaviour, and the evidence (a repro, a command, a screenshot).
