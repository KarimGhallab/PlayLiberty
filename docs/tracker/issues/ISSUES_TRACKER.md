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

| Issue                                                                                                         | State          | Category      | Summary                                                                            |
| ------------------------------------------------------------------------------------------------------------- | -------------- | ------------- | ---------------------------------------------------------------------------------- |
| [`01-silent-failures-and-live-sync-progress`](01-silent-failures-and-live-sync-progress.md)                   | `resolved`     | `bug`         | A failed sync explains nothing on screen, and a running sync shows nothing moving. |
| [`02-the-shuffle-control-reports-the-wrong-state`](02-the-shuffle-control-reports-the-wrong-state.md)         | `needs-triage` | `bug`         | Shuffle reports pressed on every playlist, not the one playing.                    |
| [`03-the-library-cannot-recover-from-a-failed-read`](03-the-library-cannot-recover-from-a-failed-read.md)     | `needs-triage` | `bug`         | A failed read is a dead end with no retry; a failed sync says nothing reassuring.  |
| [`04-the-delete-toast-denies-the-row-it-is-deleting`](04-the-delete-toast-denies-the-row-it-is-deleting.md)   | `needs-triage` | `bug`         | The undo toast claims a delete the unchanged row denies.                           |
| [`05-a-dead-cover-leaves-an-empty-box`](05-a-dead-cover-leaves-an-empty-box.md)                               | `needs-triage` | `bug`         | A failed cover image leaves an empty box and calls Google.                         |
| [`06-the-row-hides-its-door-and-the-lock-its-meaning`](06-the-row-hides-its-door-and-the-lock-its-meaning.md) | `needs-triage` | `enhancement` | The row is not a link and the lock's meaning is hover-only.                        |
| [`07-make-the-library-read-as-a-personal-gallery`](07-make-the-library-read-as-a-personal-gallery.md)         | `needs-triage` | `enhancement` | The composition reads as any media list, not a personal gallery.                   |
| [`08-animate-the-player-bar-fill-with-transform`](08-animate-the-player-bar-fill-with-transform.md)           | `needs-triage` | `enhancement` | `transition: width` on the scrub fill forces layout.                               |

## Conventions

- One file per issue, named `NN-slug.md`, numbered in creation order.
- Every issue carries exactly one state role and at most one category role, per `docs/TRIAGE_LABEL.md`.
- The issue states the observed behaviour, the expected behaviour, and the evidence (a repro, a command, a screenshot).
