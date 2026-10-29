# Release the Android app

Status: ready
Labels: `enhancement`, `ready-for-agent`

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

## User Stories

1. As an operator, I want a signed release APK, so that the app installs without a developer's machine.
2. As an operator, I want the signing key held outside the repository, so that a leaked checkout is not a leaked key.
3. As an operator, I want the key backed up, so that a lost laptop does not mean every phone is reinstalled.
4. As an operator, I want the version to come from one place, so that the APK and the package cannot disagree.
5. As an operator, I want a version code that always increases, so that an update installs over the old app.
6. As an operator, I want the build to be local, so that no cloud service holds my app.
7. As an operator, I want a documented command, so that a release does not depend on remembered flags.
8. As an operator, I want the artifact in a known place, so that I can hand it over.
9. As an operator, I want an install procedure, so that a phone gets the app without a store.
10. As an operator, I want an update procedure that keeps my data, so that a release does not cost a sign-in.
11. As an operator, I want the development build to be distinguishable, so that I know which one is installed.
12. As a user, I want the account sheet to show the version, so that I can report which build I run.
13. As a user, I want the release to keep my token across an update, so that I do not provision again.
14. As a user, I want a fresh install to ask me to sign in, so that the first run is clear.
15. As an operator, I want a release checklist, so that a build is not handed over untested.
16. As an operator, I want the checklist to prove background playback, so that the app's reason to exist is verified.
17. As an operator, I want the checklist to prove provisioning, so that a build that cannot sign in never ships.
18. As an operator, I want the checklist to prove streaming, so that the stored audio is reachable from the phone.
19. As an operator, I want no Play Store account, so that the private instance stays private.
20. As an operator, I want no crash reporting or telemetry in the release, so that the app makes no third-party request.
21. As an operator, I want the release to use the same package id as the development build, so that the app is one app.
22. As an operator, I want the consequence of a key change recorded, so that nobody discovers it on a phone.
23. As a developer, I want the release build to be reproducible, so that the same source gives the same app.
24. As a developer, I want the signing configuration read from the environment, so that no password is committed.
25. As a French-speaking user, I want the version label and the checklist's copy in French, so that the app stays in my language.

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

## Testing Decisions

- A test earns its place only if it fails when a release would be broken. The checklist is the test: each step is a
  behaviour a user relies on, and each is run on the phone that will use the app. There is no automated test of
  signing, because the failure it guards against is a missing key, which a test cannot hold.
- **The version's derivation is tested as a pure function**: a package version maps to the documented code, and the
  mapping is monotonic across a bump.
- **The checklist is the release's acceptance**, and it is recorded in the ticket that cuts the release.
- **Cut tests:** no test of the APK's signature, the keystore's contents, or the Gradle configuration.

## Out of Scope

- A Play Store listing, an app bundle, and any store distribution.
- A cloud build service.
- Crash reporting, analytics and telemetry.
- Beta channels, staged rollouts and an in-app updater.
- iOS builds and iOS distribution.
- Code shrinking, obfuscation and any binary hardening.
- A CI pipeline that signs; the release is a local, human-run procedure.

## Further Notes

- The keystore is the one artifact whose loss has a user-visible cost, so its backup is part of the procedure rather
  than advice.
- The APK is handed over as a file. The private boundary is the edge's, and the artifact's distribution is the
  owner's own.
