# 17: The egress card says OK beside "no attempt", and switches on one tap

**Status:** resolved
**Labels:** `bug`, `ready-for-agent`
**Source:** [A second design critique scores the mobile app 26/40](../../issues/123-a-second-design-critique-scores-the-mobile-app-26-40.md)

## Outcome

Implemented on 2026-11-06. The card's words and its switch now agree.

The status fact is labelled `Check result`, not `Status`: it is the verdict of the last _check_, which can exist
without a switch ever being attempted. The attempt line is `Last switch attempt`, the check time is `Last check`, the
endpoint is `Exit endpoint`, and the provider's observed address stays `Provider saw {ip}`. A card can now read `Check
result: OK` and `Last switch attempt: No attempt yet` without contradiction. Both catalogs carry the labels.

A standby's `Switch` now opens an in-place ask, `Switch this exit to {name}?`, with Cancel and a confirm. The confirm
replaces the ask and calls the switch; Cancel returns the row to `Switch`; the state resets after either. The pair sits
in the action's own slot, so the thumb reach is unchanged, and the active card's `Check` stays a single press. The
paging, busy and error paths are untouched.

Verified on the emulator at 1.0: the card reads the new labels, the first press shows the ask with the live exit still
01-FR-634, and Cancel restores `Switch` (`/tmp/opencode/t17/egress.png`, `switch-ask.png`, `switch-cancel.png`). The
confirm itself was not pressed on the live agent; `EgressScreen.test.tsx` asserts the confirm calls the switch and the
ask alone does not. The tests' fact labels and switch presses moved accordingly, and a Cancel test was added.

The root build, lint and unit run follows in the batch for this session.
