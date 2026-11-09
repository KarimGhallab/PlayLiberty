# 02: A signed release APK from a local Gradle build

**Status:** ready-for-agent
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [`01`](01-one-version-number-and-the-account-sheet-shows-it.md). The release artifact must carry the
derived version, and both tickets change the per-build Android properties.

## What to build

One local command generates the Android project and assembles a signed, universal release APK at a documented output
path in the mobile workspace's ignored build output, named with the running version. The command runs
`expo prebuild` and the Gradle release task. No EAS cloud build, no app bundle, no ABI split and no store submission.

A project-local Expo config plugin inserts the release signing configuration into the generated Android project, so a
clean prebuild reproduces it. The configuration reads four Gradle properties from a properties file outside the
repository: the keystore path, the store password, the key alias and the key password. Nothing about the key is
committed. The development build keeps the debug key and needs none of these values.

A release build with any of the four values missing fails with a message naming the missing value instead of Gradle's
generic signing error. The release command also requires the public API origin and fails without it; the origin it was
given is inlined into the artifact.

The artifact is one APK. No crash reporting, analytics or telemetry dependency or SDK is added. The real keystore is
generated once and backed up by the owner; a throwaway key outside the tree proves the mechanics here.

## Acceptance criteria

- [ ] One local command produces a signed release APK at the documented path with the version in its name; it uses no
      cloud build.
- [ ] A clean prebuild regenerates the release signing configuration; all four signing values come from outside the
      repository and no key material or password is committed.
- [ ] A release build missing any signing value fails with a message naming each missing value; a debug build needs
      none and stays debug-signed.
- [ ] A release command without the public API origin fails; the built artifact embeds the origin it was given.
- [ ] `apksigner verify` passes and names the release certificate; the artifact is one universal APK with no bundle
      and no ABI split.
- [ ] A second release built with the same key installs over the first and keeps the app's stored data.
- [ ] No crash reporting, analytics or telemetry dependency or SDK is added.

## Verification

Generate a throwaway keystore outside the tree, define the four Gradle properties in a properties file outside the
tree, set the public origin, run the release command, then run `apksigner verify --print-certs` and inspect the APK's
version fields. Install it, build again with the same key, install over it and confirm the app keeps its data. Remove
one property and confirm the release build names it, then confirm a debug build still succeeds. Finish with
`pnpm run build` and `pnpm run lint:check`.
