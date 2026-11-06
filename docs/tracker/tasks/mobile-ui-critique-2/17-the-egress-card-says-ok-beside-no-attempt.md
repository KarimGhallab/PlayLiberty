# 17: The egress card says OK beside "no attempt", and switches on one tap

**Status:** resolved
**Labels:** `bug`, `ready-for-agent`
**Source:** [A second design critique scores the mobile app 26/40](../../issues/123-a-second-design-critique-scores-the-mobile-app-26-40.md)
**Blocked by:** None. Can start immediately.

## Observed

An exit card reads "Status OK" and "Last attempt: No attempt yet" side by side, with no explanation of what an attempt
is or how a status can be known before one. Separately, the standby's "Switch" changes the instance-wide egress exit on
a single tap, with no confirmation and no undo, from a control a thumb can reach by accident.

## Expected

The card's facts agree with each other, and the taxonomies are named: a check, an attempt, and the provider's view are
different things and the card says which is which. Switching the exit either asks once, in place, as sign-out now does,
or offers an undo.

## Evidence

- Screenshot `a-egress.png`: "Status OK" and "Last attempt: No attempt yet" in the same card.
- `apps/mobile/src/views/egress/EgressScreen/EgressScreen.tsx:240-253`: the switch action.
- `apps/mobile/src/shared/components/AccountSheet/AccountSheet.tsx:191-230`: the in-place confirm this can reuse.

## Acceptance criteria

- [x] No card states a status that contradicts its attempt line.
- [x] Each fact's label says what it is: the last check, the last attempt, the provider's address.
- [x] Switching the exit asks once before it acts, or is undoable.
- [x] The admin can still reach the action with a thumb.
- [x] Both catalogs carry the copy.

## Verification

Open VPN settings on the emulator and read a standby card; press Switch and confirm nothing changes until the second
press. Then `pnpm --filter @playliberty/mobile test`.

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

Checks: mobile typecheck and suite pass. The root build, lint and unit run follows in the batch for this session.
