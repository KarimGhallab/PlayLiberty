# 02: A signed release APK from a local Gradle build

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

## Outcome

The release is one local command: `pnpm mobile:release` reads a properties file outside the repository
(`~/.config/playliberty/android-release.properties` by default), requires an HTTPS `EXPO_PUBLIC_API_BASE_URL`, runs
`expo prebuild` and `assembleRelease`, and copies the signed APK to `apps/mobile/dist/playliberty-<version>.apk`. The
properties file and the keystore must live outside the worktree; a path inside fails with a named error.

A project-local Expo config plugin regenerates the release signing configuration on a clean prebuild. It adds
`signingConfigs.release` reading the four `PLAYLIBERTY_RELEASE_*` Gradle properties, switches the release build type
from the debug key, and adds a `preReleaseBuild` guard that names every missing property. The development build keeps
the debug key and needs none of the values.

The Babel config now resolves Expo's own `babel-preset-expo` through the `expo` package. pnpm does not hoist the preset
into the mobile package, and the release bundle could not start without it.

Verified with a throwaway keystore outside the tree and `https://pl.example.test`:

- `apksigner verify --print-certs` names `CN=PlayLiberty Release Test`.
- `aapt dump badging` reports `versionCode=1000`, `versionName=0.1.0`, and the four ABIs in one universal APK.
- The origin appears once in `assets/index.android.bundle`.
- A missing signing value fails at the command with its name; Gradle's `preReleaseBuild` guard names all four.
- A debug build without any signing value succeeds and is signed by `CN=Android Debug`.
- The release installs over the existing debug build only after an uninstall; the differing signatures are refused.
- A release installs over the previous release with `firstInstallTime` unchanged and `lastUpdateTime` advanced.
- The full unit suite, lint and build pass. No dependency or telemetry SDK was added.

See [`32-release-the-android-app`](../../specs/32-release-the-android-app.md).
