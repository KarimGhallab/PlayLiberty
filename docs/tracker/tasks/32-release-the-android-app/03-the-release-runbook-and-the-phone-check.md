# 03: The release runbook and the phone check

**Status:** ready-for-agent
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [`02`](02-a-signed-release-apk-from-a-local-gradle-build.md). It documents the artifact path and the
signing procedure that ticket produces.

## What to build

A runbook under `docs/runbooks/` for the Android release, owned by the person who runs it. It covers:

- The one-time key generation, its alias and validity, its location outside the repository, its backup, and the
  consequence of losing it: every phone must uninstall, which loses the token and requires provisioning.
- The build: the required public origin, the release command and the artifact path.
- A fresh install: transfer the APK to the phone, allow the install from that source, open the app and provision.
- An update: install the new APK over the existing app with the same key. Data, the session and the playlist data
  survive; the procedure never asks for a reinstall.
- The development build: it is debug-signed, so a release installs over it only after an uninstall, which loses the
  token and re-runs provisioning.
- The release checklist, with an observable pass or fail for each step: install, provision, stream a track, let a
  track end with the screen off, open the account sheet and read the version, then update and confirm the session
  survived.

The overview docs that still call the signed APK the remaining release step now state that the app is distributed by
this procedure and point at the runbook.

## Acceptance criteria

- [ ] The runbook names the artifact path, the release command, the required public origin and where the four signing
      values live outside the tree.
- [ ] Fresh install and update are separate documented paths; an update keeps the app's data and session when the key
      matches and never asks for a reinstall.
- [ ] The development-build consequence is stated: it is debug-signed; a release over it needs an uninstall, which
      loses the token and requires provisioning.
- [ ] Key generation, validity, backup and the consequence of loss are documented.
- [ ] The checklist has an observable pass or fail step for install, provisioning, streaming, a track ending with the
      screen off, the account sheet version, and an update preserving the session.
- [ ] The overview docs that called the APK the remaining step point at the runbook.
- [ ] The checklist has been run on the target phone and its outcome, including the running version, is recorded.

## Verification

Follow the runbook from the release APK on the target phone and record each checklist result in this ticket: the
running version, the provisioning result, the streaming result, the screen-off result and the update result. Without
the phone the documentation can be reviewed but the ticket stays open, because a build is not a release.
