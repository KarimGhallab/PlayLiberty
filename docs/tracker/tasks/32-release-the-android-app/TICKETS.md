# 32: Release the Android app

Tickets for [`32-release-the-android-app`](../../specs/32-release-the-android-app.md).

| Ticket                                                                                                            | Status          | Blocked by                                                      | Blocks                                                       |
| ----------------------------------------------------------------------------------------------------------------- | --------------- | --------------------------------------------------------------- | ------------------------------------------------------------ |
| [`01-one-version-number-and-the-account-sheet-shows-it`](01-one-version-number-and-the-account-sheet-shows-it.md) | resolved        | none                                                            | [`02`](02-a-signed-release-apk-from-a-local-gradle-build.md) |
| [`02-a-signed-release-apk-from-a-local-gradle-build`](02-a-signed-release-apk-from-a-local-gradle-build.md)       | resolved        | [`01`](01-one-version-number-and-the-account-sheet-shows-it.md) | [`03`](03-the-release-runbook-and-the-phone-check.md)        |
| [`03-the-release-runbook-and-the-phone-check`](03-the-release-runbook-and-the-phone-check.md)                     | ready-for-human | none                                                            | none                                                         |

## Conventions

- One file per ticket, numbered in dependency order, blockers first.
- The release is a local, human-run procedure. No CI job signs and no cloud build is used.
- Resolve a ticket by recording the outcome in the ticket and updating its row here. Do not delete it.
