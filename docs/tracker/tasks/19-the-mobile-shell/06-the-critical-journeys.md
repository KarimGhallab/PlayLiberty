# 06: The critical journeys run on the device

**Status:** ready-for-agent
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [`01`](01-the-sheet-names-you.md), [`02`](02-sign-out-and-language.md),
[`04`](04-the-screens-stay-current.md), [`05`](05-operable-without-sight.md), and specs
[`21`](../../specs/21-see-the-library.md) and [`22`](../../specs/22-read-a-playlist.md)

## What to build

The four critical journeys as Maestro flows, run against the real app on the device, with the real secure store and
the real router:

- The app opens on the gallery, and the account sheet opens and closes.
- A signed-out app shows one action and nothing else.
- A deep link to a track opens the track route.
- A language switch renders French after a restart.

Maestro is not installed, so this ticket starts with the human installing it. The flows run on `emulator-5554` for
now. The physical-device pass is not claimed here: it becomes a release step in spec `32`.

## Acceptance criteria

- [ ] The four flows pass against a running instance on the emulator.
- [ ] The flows are committed beside the app and run with one command.
- [ ] A failing flow names the journey it covers.
- [ ] The physical-device pass is recorded as a release step in spec `32`, not claimed by this ticket.

## Verification

`maestro test` on `emulator-5554`, all four flows green.

See [`19-the-mobile-shell`](../../specs/19-the-mobile-shell.md).
