# 09: The gallery journeys

**Status:** ready-for-agent
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [`02`](02-the-gallery-draws-the-playlists.md), [`05`](05-the-add-sheet.md), [`07`](07-the-cards-actions.md)

## What to build

Three Maestro flows for the gallery's critical journeys. Each flow establishes its own starting state, signing in through the existing fallback when the app is signed out.

- The gallery opens and a card reaches its playlist.
- A playlist is added from the floating action: the sheet opens, the link is pasted, Add is pressed, the sheet closes and the new playlist appears under the Syncing heading.
- A playlist is pinned from its card: the overflow opens, Pin is pressed, and the Pinned heading appears.

The add flow takes its source link from the runner, so the dev instance's source is not hardcoded in the flow.

## Acceptance criteria

- [ ] The three flows pass on the emulator against the dev topology.
- [ ] Each flow is independent and establishes its own state.
- [ ] The add flow takes its source link from the runner.
- [ ] The flows use the existing sign-in fallback and leave the device in a known state.

## Verification

`PATH="$HOME/.maestro/bin:$PATH" maestro test -e SOURCE_URL=<source> apps/mobile/.maestro`, with the add flow's source link supplied to the runner.
