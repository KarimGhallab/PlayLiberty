# Android release runbook

This runbook builds, installs and updates the signed Android APK. The decisions are owned by
[`32-release-the-android-app`](../tracker/specs/32-release-the-android-app.md).

## Prerequisites

- The toolchain pinned in `mise.toml`: Node, pnpm, JDK 21 and the Android SDK. Run `mise install`.
- `ANDROID_HOME` exported to the SDK root that holds the platform and build tools the generated project asks for.
- `adb` on `PATH` for the USB path, or a file manager on the phone.
- The instance's public HTTPS origin. The app's API base and its App Links use this origin.
- The release keystore and its properties file, both outside the repository.

## The signing key

Generate the key once. The certificate must outlive every phone that will install the app; 10000 days is about 27
years.

```sh
mkdir -p ~/.config/playliberty
keytool -genkeypair -v \
  -keystore ~/.config/playliberty/playliberty-release.jks \
  -alias playliberty \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -storepass '<store password>' -keypass '<key password>' \
  -dname 'CN=PlayLiberty, O=PlayLiberty, C=US'
```

Write `~/.config/playliberty/android-release.properties`:

```properties
PLAYLIBERTY_RELEASE_STORE_FILE=/home/<user>/.config/playliberty/playliberty-release.jks
PLAYLIBERTY_RELEASE_STORE_PASSWORD=<store password>
PLAYLIBERTY_RELEASE_KEY_ALIAS=playliberty
PLAYLIBERTY_RELEASE_KEY_PASSWORD=<key password>
```

The release command rejects a properties file or a keystore inside the worktree. Keep the passwords in a password
manager.

Back up the keystore and the passwords to two offline places. The key is the app's identity: an update installs over
an existing app only when both are signed with the same key. If the key is lost, every phone must uninstall the app,
which deletes its token and local state, and provisioning must run again.

## Build

```sh
export EXPO_PUBLIC_API_BASE_URL=https://<instance origin>
pnpm mobile:release
```

The command runs `expo prebuild` and the Gradle release build, then writes:

```text
apps/mobile/dist/playliberty-<version>.apk
```

The version is the mobile package's version. Bump it once for a release; the Android version name and the derived
version code follow it. The artifact is one universal APK: there is no app bundle and no per-ABI split.

The command fails, naming the cause, when the public origin is missing or not HTTPS, when a signing value is missing,
or when the properties file or the keystore is inside the repository. `PLAYLIBERTY_RELEASE_PROPERTIES` overrides the
properties file path.

The debug build is unaffected: it is signed with the debug key and needs none of these values.

## Install

### A fresh install

1. Transfer `apps/mobile/dist/playliberty-<version>.apk` to the phone. Over USB:

   ```sh
   adb install apps/mobile/dist/playliberty-<version>.apk
   ```

   Or copy the file to the phone and open it, allowing installs from that source when Android asks.

2. Open the app and tap **Sign in**. Finish the sign-in in the browser; the browser returns to the app.
3. The library appears. Grant the notification permission when Android asks; background playback needs it.

### An update

Do not uninstall. Build the next version and install it over the app:

```sh
adb install -r apps/mobile/dist/playliberty-<version>.apk
```

Or open the new file on the phone and install it over the existing app. The app's data, token and playlists survive
when the key matches, and no sign-in is asked for.

### Moving from a development build

A development build is signed with the debug key. A release installs over it only after an uninstall:

```sh
adb uninstall dev.playliberty.app
adb install apps/mobile/dist/playliberty-<version>.apk
```

The uninstall deletes the token and local state; sign in again. This is the one path that re-provisions the phone.

If an install fails with `INSTALL_FAILED_UPDATE_INCOMPATIBLE`, the installed app was signed with another key. Restore
the original keystore from backup; uninstalling is the only alternative and loses the data.

## The release checklist

Run every check on the phone that will use the app. Record the version and each result in the release ticket.

| Check          | How                                                                                            | Pass                                                                  |
| -------------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Install        | Install the APK on the phone.                                                                  | The app opens.                                                        |
| Provision      | Tap **Sign in**, finish in the browser, return to the app.                                     | The library appears.                                                  |
| Stream         | Open a playlist with at least two playable tracks and start the first.                         | Audio plays.                                                          |
| Screen off     | Seek to within ten seconds of the track's end, turn the screen off, wait through the boundary. | The next track starts with the screen off.                            |
| Version        | Open the account sheet.                                                                        | The foot reads `Version <version>` and matches the APK.               |
| Update         | Bump the version, build, install with `-r`, open the app and the account sheet.                | The session and playlists survive and the foot shows the new version. |
| No third party | Note any crash reporting, analytics prompt or unexpected account request during the run.       | None appears.                                                         |

The release is not handed over until every row passes.
