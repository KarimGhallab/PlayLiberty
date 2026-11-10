#!/usr/bin/env bash
# A mocked journey stack: the harness server (fake YouTube, no network), the e2e
# web origin the app signs in through, Metro, and the dev client on the device.
# Locally the app is already installed; CI sets MOBILE_INSTALL_APP=1 to build it.
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$root"

# Clear of the dev stack (8080, 5173, Metro 8081) and of the web e2e's instances.
server_port=8095
web_port=5295
metro_port=8096
work="$root/e2e/mobile/.mobile"
archive="$root/e2e/mobile/.mobile-runs"
runs_kept=3
harness_env="$root/apps/mobile/.env.development.local"
harness_env_backup="$root/apps/mobile/.expo/e2e-env.development.local"
server_pid=
web_pid=
metro_pid=
window_scale=
transition_scale=
animator_scale=
animations_saved=0
env_saved=0

if ! adb devices | tail -n +2 | grep -qw device; then
  echo 'No Android device is attached. Start the emulator or plug in the phone.' >&2
  exit 1
fi

# A phone and the emulator both answer `adb`, so every call names one device.
export ANDROID_SERIAL="${ANDROID_SERIAL:-$(adb devices | awk '$2 == "device" { print $1; exit }')}"

for port in "$server_port" "$web_port" "$metro_port"; do
  if ss -ltn | awk '{ print $4 }' | grep -q ":$port\$"; then
    echo "Port $port is already in use. Stop what holds it and run again." >&2
    exit 1
  fi
done

# A failed run's logs are the next run's evidence, so the live directory is
# rotated rather than deleted, and only the newest few runs are kept.
rotate_work() {
  local stamp count
  stamp=$(date +%Y%m%d-%H%M%S)

  mkdir -p "$archive"

  if [ -d "$work" ]; then
    if [ -e "$archive/$stamp" ]; then
      stamp="$stamp-$$"
    fi

    mv "$work" "$archive/$stamp"
  fi

  mkdir -p "$work/media"

  count=$(find "$archive" -mindepth 1 -maxdepth 1 -type d | wc -l)

  if [ "$count" -gt "$runs_kept" ]; then
    find "$archive" -mindepth 1 -maxdepth 1 -type d | sort |
      head -n "$((count - runs_kept))" |
      while IFS= read -r old; do
        rm -rf -- "$old"
      done
  fi
}

rotate_work


# A stale harness answers with an old adapter; the compile is a few seconds.
pnpm --filter @playliberty/server run build:e2e > "$work/build.log" 2>&1

# A failed or interrupted run still gives the device its settings back.
restore_animation() {
  local key=$1 value=$2

  if [ "$value" = 'null' ] || [ -z "$value" ]; then
    adb shell settings delete global "$key" > /dev/null 2>&1 || true
  else
    adb shell settings put global "$key" "$value" > /dev/null 2>&1 || true
  fi
}

restore_animations() {
  if [ "$animations_saved" = 0 ]; then
    return
  fi

  restore_animation window_animation_scale "$window_scale"
  restore_animation transition_animation_scale "$transition_scale"
  restore_animation animator_duration_scale "$animator_scale"
}

# Expo's dev bundle merges the .env files over the process environment and
# .env.development.local is last, so the harness owns that file and leaves the
# developer's .env.local alone. A file a killed run left behind is discarded.
write_env() {
  local line="EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:$web_port"

  mkdir -p "$(dirname "$harness_env_backup")"

  if [ -f "$harness_env_backup" ]; then
    rm -f "$harness_env"
  elif [ -f "$harness_env" ]; then
    if [ "$(cat "$harness_env")" = "$line" ]; then
      rm -f "$harness_env"
    else
      mv "$harness_env" "$harness_env_backup"
    fi
  fi

  env_saved=1
  printf '%s\n' "$line" > "$harness_env"
}

restore_env() {
  if [ "$env_saved" = 0 ]; then
    return
  fi

  rm -f "$harness_env"

  if [ -f "$harness_env_backup" ]; then
    mv "$harness_env_backup" "$harness_env"
  fi
}

cleanup() {
  restore_env
  restore_animations

  for pid in "$server_pid" "$web_pid" "$metro_pid"; do
    if [ -n "$pid" ]; then
      kill "$pid" 2>/dev/null || true
    fi
  done
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

# The harness variables belong to the server alone: NODE_ENV=test reaches the RN
# dev middleware and makes it assert as if it were under Jest.
env \
  NODE_ENV=test \
  E2E_HARNESS=true \
  HOST=127.0.0.1 \
  PORT="$server_port" \
  LOG_LEVEL=warn \
  MEDIA_ROOT="$work/media" \
  DATABASE_PATH="$work/playliberty.db" \
  E2E_FAKE_SCRIPT="$work/scenario.json" \
  MOBILE_REDIRECT_URIS='dev.playliberty.app://provision,exp+playliberty://provision' \
  PRUNE_CRON='0 0 1 1 *' \
  DOWNLOAD_SLEEP_REQUESTS=0 \
  node apps/server/dist-e2e/main.js > "$work/server.log" 2>&1 &
server_pid=$!

VITE_API_TARGET="http://127.0.0.1:$server_port" \
  pnpm --filter @playliberty/web exec vite --mode e2e \
  --port "$web_port" --strictPort --host 127.0.0.1 \
  > "$work/web.log" 2>&1 &
web_pid=$!

# The origin is in .env.development.local, the last file Expo's dev bundle
# merges; the developer's .env.local stays untouched.
write_env
CI=1 pnpm --filter @playliberty/mobile exec expo start --dev-client \
  --port "$metro_port" --clear --localhost \
  > "$work/metro.log" 2>&1 &
metro_pid=$!

# A failing stack leaves its reason in the log the author reads, not a curl exit.
wait_for() {
  local url=$1
  local name=$2

  for _ in $(seq 1 60); do
    if curl -fsS "$url" > /dev/null 2>&1; then
      return 0
    fi

    sleep 2
  done

  echo "$name never answered $url." >&2
  tail -n 40 -- "$work/server.log" "$work/web.log" "$work/metro.log" >&2 || true
  exit 1
}

wait_for "http://127.0.0.1:$server_port/healthz" 'The harness server'
wait_for "http://127.0.0.1:$web_port/" 'The e2e web origin'
wait_for "http://127.0.0.1:$metro_port/status" 'Metro'

adb reverse "tcp:$metro_port" "tcp:$metro_port" > /dev/null
adb reverse "tcp:$web_port" "tcp:$web_port" > /dev/null

# The cover flow takes the first tile in the system picker, so the picker must
# hold the fixture alone: every harness image from an earlier run is cleared
# first, since stale tiles would share the grid.
adb shell rm -f '/sdcard/Pictures/playliberty-*.png' \
  '/sdcard/Pictures/playliberty-*.jpg' '/sdcard/Pictures/playliberty-*.webp'
adb push .github/assets/readme/02-playlist.webp \
  /sdcard/Pictures/playliberty-cover.webp
adb shell am broadcast -a android.intent.action.MEDIA_SCANNER_SCAN_FILE \
  -d file:///sdcard/Pictures/playliberty-cover.webp > /dev/null

# The picker reads MediaStore, and the scan reaches it a moment later.
for _ in $(seq 1 30); do
  if adb shell content query --uri content://media/external/images/media \
    --projection _display_name 2>/dev/null |
    grep -q 'playliberty-cover.webp'; then
    break
  fi

  sleep 2
done

# A system animation moves the target between the hierarchy read and the tap,
# and the journeys assume none. The cleanup trap gives the device its values back.
window_scale=$(adb shell settings get global window_animation_scale | tr -d '\r')
transition_scale=$(adb shell settings get global transition_animation_scale | tr -d '\r')
animator_scale=$(adb shell settings get global animator_duration_scale | tr -d '\r')
animations_saved=1
adb shell settings put global window_animation_scale 0 > /dev/null
adb shell settings put global transition_animation_scale 0 > /dev/null
adb shell settings put global animator_duration_scale 0 > /dev/null

# The dev client is the app under test; CI builds it, a local run already has it.
if [ "${MOBILE_INSTALL_APP:-0}" = 1 ]; then
  pnpm --filter @playliberty/mobile exec expo run:android --no-bundler
fi

E2E_API="http://127.0.0.1:$server_port" E2E_FAKE_SCRIPT="$work/scenario.json" \
  node e2e/mobile/scripts/seed-mobile.mjs
# shellcheck disable=SC1091
. "$work/env.sh"

# A fresh install state, as CI's fresh emulator has: no session from another
# instance, no language choice, and a cold start that honours the deep link.
adb shell pm clear dev.playliberty.app > /dev/null || true
sleep 3

# A cleared dev client restores its onboarding sheet and its floating gear; the
# gear is drawn over the app and steals taps meant for it. The run turns both
# off, which the client reads once at launch.
adb shell "run-as dev.playliberty.app sh -c 'mkdir -p shared_prefs && cat > shared_prefs/expo.modules.devmenu.sharedpreferences.xml'" <<'XML'
<?xml version='1.0' encoding='utf-8' standalone='yes' ?>
<map>
    <boolean name="showFab" value="false" />
    <boolean name="isOnboardingFinished" value="true" />
    <boolean name="showsAtLaunch" value="false" />
</map>
XML

# A cleared launcher sometimes takes the intent before it is ready and sits on
# its server list; the screen says so, and a second delivery loads the bundle.
for attempt in 1 2 3; do
  adb shell am force-stop dev.playliberty.app
  adb shell am start -W -a android.intent.action.VIEW \
    -d "exp+playliberty://expo-development-client/?url=http%3A%2F%2Flocalhost%3A$metro_port" \
    > /dev/null 2>&1 || true
  sleep 12

  if ! adb exec-out uiautomator dump /dev/tty 2>/dev/null | grep -q 'DEVELOPMENT SERVERS'; then
    break
  fi
done

# Extra arguments name flows, so a single journey runs against the same stack.
E2E_RUN_DIR="$work" \
MAESTRO_EXCLUDE_TAGS=egress \
  pnpm --filter @playliberty/e2e-mobile exec node scripts/run-maestro.mjs "$@"
