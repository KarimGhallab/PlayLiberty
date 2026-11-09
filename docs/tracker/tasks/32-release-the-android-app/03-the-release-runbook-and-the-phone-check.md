# 03: The release runbook and the phone check

**Status:** ready-for-human
**Labels:** `enhancement`, `ready-for-human`
**Blocked by:** None. The runbook is written; the phone check awaits the target phone.

## Outcome

The runbook is [`docs/runbooks/android-release.md`](../../../runbooks/android-release.md). It owns the signing key, the
build command and artifact path, the fresh install and update paths, the development-build consequence and the release
checklist. [`ARCHITECTURE.md`](../../../ARCHITECTURE.md) and [`PRODUCT.md`](../../../PRODUCT.md) point at it.

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
documentation can be reviewed, but the ticket stays open until the record is complete.
