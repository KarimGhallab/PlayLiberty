# 01: One version number, and the account sheet shows it

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

## Outcome

The mobile package version now feeds the Expo config. `app.config.ts` reads `version` from the mobile package and
derives `android.versionCode` as `major * 1_000_000 + minor * 1_000 + patch`, rejecting an out-of-range component, a
prerelease or a build suffix with a message naming the cause. `app.json` no longer carries a version or a version
code. A clean Android prebuild generated `versionName "0.1.0"` and `versionCode 1000`.

The account sheet shows `Version 0.1.0` in its footer from the config embedded in the running binary, in English and
French, while the account loads and after a failed read. A build without a version omits the line.

The derivation boundaries and the sheet's version line are covered by tests. The full unit suite, lint and build pass.
A Maestro run on the emulator signed in, opened the account sheet and read the version from the running bundle.

See [`32-release-the-android-app`](../../specs/32-release-the-android-app.md).
