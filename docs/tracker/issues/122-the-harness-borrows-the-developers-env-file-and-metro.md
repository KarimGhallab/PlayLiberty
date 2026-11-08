# 122: The harness borrows the developer's env file and Metro

**State:** `resolved`
**Category:** `bug`

## Outcome

The process-environment route the ticket proposed was tested and does not work in a development bundle: `@expo/metro-config` builds a virtual env module that merges the `.env` files over `process.env`, last file wins, so the developer's `.env.local` still defeats a shell value, and `EXPO_NO_DOTENV` does not change that merge.

The harness therefore owns a different file. It writes `apps/mobile/.env.development.local`, the last file Expo's dev bundle merges, with the harness origin, and never reads or writes `apps/mobile/.env.local`. An existing `.env.development.local` is moved to `apps/mobile/.expo/e2e-env.development.local`, outside `$work`, and restored by the `cleanup` trap; `INT` and `TERM` now exit through it, and a stale harness file left by a killed run is discarded at the next start. The README's mocked-harness section and the new "The two Metros" section name the harness Metro on 8096 with `e2e/.mobile/metro.log` and the dev Metro on 8081 with `apps/mobile/.expo/dev/logs/start.log`, give the step back to the 8081 project, and state that the harness `--clear` empties the shared `/tmp/metro-cache`.

A SIGKILL cannot run the trap, but it cannot alter `.env.local`: the script no longer names it, and the harness-owned file is cleaned at the next start.
