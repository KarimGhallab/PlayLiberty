# 01: One version number, and the account sheet shows it

**Status:** ready-for-agent
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** None. Can start immediately.

## What to build

The mobile package's version is the only version a release bumps. Resolving the Expo config takes that value as the
app version and derives the Android version code from the same value, so an APK cannot disagree with the package. The
static Expo configuration keeps no version and no version code of its own.

The derivation is fixed-decimal and monotonic: `major * 1_000_000 + minor * 1_000 + patch`, with `major` below 2100 and
`minor` and `patch` below 1000. A value outside those bounds, or a prerelease or build suffix, fails config resolution
with a message naming the offending part. Two different versions never share a code.

The account sheet shows the running build's version at its foot, below the sign-out row. The value comes from the
config embedded in the installed binary, not from a source constant. The line is present in English and French, in the
loading, failed-read and loaded states, and at 200% text scale. A build made from a different package version shows
the new number.

## Acceptance criteria

- [ ] The mobile package version is the only place a release version is edited; the static Expo config carries no
      version or version code.
- [ ] Resolving the Expo config yields that version and the derived code; bumping any semver component increases the
      code, and an out-of-range component or suffix fails with a message naming it.
- [ ] The account sheet shows `Version <version>` at its foot in English and French, under 200% text scale, with the
      account loading and after a failed account read.
- [ ] The displayed version comes from the running build's embedded config; a build with a different package version
      shows the new number.
- [ ] Tests cover the derivation boundaries and the sheet's version line.

## Verification

Run `pnpm --filter @playliberty/mobile run test` and `pnpm run build`, then resolve the Expo config for the mobile app
and compare its `version` and `android.versionCode` with the package version. Run a clean Android prebuild and confirm
the generated project carries the same `versionName` and `versionCode`. Install a build, open the account sheet and
read the version. Finish with `pnpm run lint:check`.
