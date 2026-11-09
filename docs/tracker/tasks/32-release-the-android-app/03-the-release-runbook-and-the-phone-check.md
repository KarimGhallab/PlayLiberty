# 03: The release runbook and the phone check

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

## Outcome

The runbook is [`docs/runbooks/android-release.md`](../../../runbooks/android-release.md). It owns the signing key, the
build command and artifact path, the fresh install and update paths, the development-build consequence and the release
checklist. [`ARCHITECTURE.md`](../../../ARCHITECTURE.md) and [`PRODUCT.md`](../../../PRODUCT.md) point at it.

## Release record

This table records the checklist run on the target phone. Every row must pass before the release is handed over.

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

Follow the runbook from the release APK on the target phone and record each result above.
