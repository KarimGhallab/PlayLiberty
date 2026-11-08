# 05: Sign out acts on one press

**Status:** resolved
**Labels:** `bug`, `ready-for-agent`
**Source:** [A design critique scores the mobile app 26/40](../../issues/108-a-design-critique-scores-the-mobile-app-26-40.md)

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
