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

| Issue                                                                                       | State          | Category | Summary                                                                            |
| ------------------------------------------------------------------------------------------- | -------------- | -------- | ---------------------------------------------------------------------------------- |
| [`01-silent-failures-and-live-sync-progress`](01-silent-failures-and-live-sync-progress.md) | `needs-triage` | `bug`    | A failed sync explains nothing on screen, and a running sync shows nothing moving. |

## Conventions

- One file per issue, named `NN-slug.md`, numbered in creation order.
- Every issue carries exactly one state role and at most one category role, per `docs/TRIAGE_LABEL.md`.
- The issue states the observed behaviour, the expected behaviour, and the evidence (a repro, a command, a screenshot).
