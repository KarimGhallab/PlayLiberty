# Release the Android app

Status: resolved
Labels: `enhancement`

## Problem Statement

The app exists as a development build that installs from a developer's machine. Nothing owns how it is signed, how
its version is decided, how it is built for the phone that will use it, or how an update is installed over it. A
sideloaded Android app is updated by installing a new APK over the old one, and that only keeps the account's data
when both are signed with the same key. Lose the key and every phone has to uninstall, losing its token, and
re-provision.

The second problem is that "fully implemented" is not observable until the app installs on the phone that will use
it. A release is a check, not a build: the APK must provision, stream, and keep playing with the screen off.

## Solution

One release procedure. A keystore generated once and held outside the repository, a version taken from the app's
package, a local Gradle release build that produces a signed APK, and a documented install and update path. The
account sheet shows the running version so a person can tell which build they hold. A release checklist proves the
APK provisions, plays and survives the screen going off before it is handed over.

## Implementation Decisions

- **The release is a local Gradle build, not a cloud build.** `expo prebuild` generates the Android project and
  `assembleRelease` produces the APK, with no EAS cloud build and no store submission. `Decided here:` the app is
  private, its origin is the owner's, and a cloud build would be a third party in the path of a private artifact.
- **The signing key is generated once, held outside the repository, and backed up.** Its path, alias and passwords
  reach the build from the environment or a properties file outside the tree, and nothing about it is committed.
  `Decided here:` losing the key means every install must be uninstalled and reinstalled, which loses the token and
  forces provisioning.
- **The version comes from the app's package, and the Android version code is derived from it.** One number decides
  both, so an APK cannot disagree with the package it was built from, and a release is one bump. `Decided here:` a
  hand-maintained integer is the field people forget, and the derived code is monotonic for any semver bump.
- **The development build keeps the debug key.** `Decided here:` signing every development build with the release key
  would put the key on every machine that builds. The consequence is recorded: a release installs over a development
  build only after an uninstall, which loses the token and re-runs provisioning.
- **The artifact is a signed APK in a documented output path.** There is no app bundle, no store listing and no
  split by ABI; one APK installs on the phone.
- **The install and update paths are documented.** A fresh install is a file transfer and an install; an update is
  the same install over the existing app, which keeps its data when the key matches. An update never asks for a
  reinstall.
- **The account sheet shows the running version at its foot.** `Decided here:` the one screen the app owns that is
  not content is where a build number belongs, and it costs one line.
- **A release checklist is part of the procedure**, run on the phone that will use the app: install, provision,
  stream a track, let a track end with the screen off, open the account sheet and read the version. `Decided here:`
  the build is not the release; the checklist is.
- **The release makes no third-party request.** No crash reporting, no analytics and no telemetry, matching the
  product's private-instance principle.
- **The minimum and target Android versions are the Expo SDK's defaults**, not re-decided here.
- **Inherited decisions are referenced, not restated:** the package id and the deep-link configuration are spec
  `19`'s and spec `30`'s; the provisioning flow is spec `20`'s; the background playback is spec `24`'s.

## Out of Scope

- A Play Store listing, an app bundle, and any store distribution.
- A cloud build service.
- Crash reporting, analytics and telemetry.
- Beta channels, staged rollouts and an in-app updater.
- iOS builds and iOS distribution.
- Code shrinking, obfuscation and any binary hardening.
- A CI pipeline that signs; the release is a local, human-run procedure.
