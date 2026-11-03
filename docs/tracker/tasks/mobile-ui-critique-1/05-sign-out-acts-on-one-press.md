# 05: Sign out acts on one press

**Status:** resolved
**Labels:** `bug`, `ready-for-agent`
**Source:** [A design critique scores the mobile app 26/40](../../issues/108-a-design-critique-scores-the-mobile-app-26-40.md)
**Blocked by:** None. Can start immediately.

## Observed

The account sheet's last row is a red Sign out that calls `onSignOut` on the first press. It sits at the sheet's bottom
edge, where a thumb rests. Signing out discards the instance token, and getting back in needs the browser handoff
again.

## Expected

A destructive action that costs a re-provisioning asks once. The share sheet already proves the pattern in this app:
the revoke arm opens inside the row it will affect, with the confirmation in place.

## Evidence

- `apps/mobile/src/shared/components/AccountSheet/AccountSheet.tsx`: the `account-sign-out` pressable calls `onSignOut`
  directly.
- The 2026-11-03 critique screenshots of the account sheet: Sign out is the last row, below a hairline.
- `ShareSheet.tsx`: the in-place revoke confirm this should reuse.

## Acceptance criteria

- [x] The first press arms a confirm inside the row, and the second signs out.
- [x] The armed state is announced, and system back, the sheet's close control, or a press outside disarms it.
- [x] The confirm keeps a 48dp target and names the cost in one sentence.
- [x] Both languages carry the new copy.
- [x] A test covers arm, confirm and disarm.

## Outcome

The account sheet now asks before it signs out. The first press replaces the row with the question and two controls:
the sentence "Signing out means signing in again through the browser." (fr "Se déconnecter oblige à se reconnecter via
le navigateur."), Cancel, and the destructive Sign out. Both controls keep `touchTarget`, and the destructive one is
the red fill the share sheet already uses.

The question is announced through `useAnnouncement` and an alert role, so it reaches VoiceOver and TalkBack. The
armed state is cleared whenever `visible` changes, which covers the system back, the sheet's close control and the
backdrop, since all three close the sheet; Cancel clears it in place. Verified on the emulator in French: the first
press showed the sentence, Cancel restored the row, and closing with the close control then reopening showed the row
again rather than the question.

Tests cover arm then confirm, cancel, the French copy, and that the first press never calls `onSignOut`.
