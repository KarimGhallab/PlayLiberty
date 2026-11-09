# 03: The release runbook and the phone check

**Status:** ready-for-human
**Labels:** `enhancement`, `ready-for-human`
**Blocked by:** None. The runbook is written; the phone check awaits the target phone.

## What was built

The runbook is [`docs/runbooks/android-release.md`](../../../runbooks/android-release.md). It covers the one-time key
generation and backup, the build command and artifact path, a fresh install, an update over the same key, the
development-build uninstall consequence, and the release checklist.

The overview docs that called the signed APK the remaining step now state that the app is distributed by the runbook:
[`ARCHITECTURE.md`](../../../ARCHITECTURE.md) in its summary, deployment shapes and mobile stack, and
[`PRODUCT.md`](../../../PRODUCT.md) in the platform section.

## Acceptance criteria

- [x] The runbook names the artifact path, the release command, the required public origin and where the four signing
      values live outside the tree.
- [x] Fresh install and update are separate documented paths; an update keeps the app's data and session when the key
      matches and never asks for a reinstall.
- [x] The development-build consequence is stated: it is debug-signed; a release over it needs an uninstall, which
      loses the token and requires provisioning.
- [x] Key generation, validity, backup and the consequence of loss are documented.
- [x] The checklist has an observable pass or fail step for install, provisioning, streaming, a track ending with the
      screen off, the account sheet version, and an update preserving the session.
- [x] The overview docs that called the APK the remaining step point at the runbook.
- [ ] The checklist has been run on the target phone and its outcome, including the running version, is recorded.

## Release record

This table is filled when the checklist runs on the target phone. The ticket stays open until every row passes.

Target phone:
Release version:

| Check          | Result |
| -------------- | ------ |
| Install        |        |
| Provision      |        |
| Stream         |        |
| Screen off     |        |
| Version        |        |
| Update         |        |
| No third party |        |

## Verification

Follow the runbook from the release APK on the target phone and record each result above. Without the phone the
documentation can be reviewed, but the ticket stays open, because a build is not a release.
