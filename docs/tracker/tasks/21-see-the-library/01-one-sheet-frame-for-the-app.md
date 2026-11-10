# 01: One sheet frame for the app

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

## Outcome

The app now has one modal frame, `Sheet` under the shared components. It owns the scrim, the backdrop, the top drag handle, the 80-point and 0.5-velocity dismissal decision, the settle on `motion-base` with the project's one curve, the reduced-motion jump, the bottom safe inset and the title heading. A caller supplies the title, the content, the two test ids and a close request.

The account sheet now draws only its own content: the failure alert, the identity with its avatar or monogram, the language control with its sliding thumb, the hairline and Sign out.

The close request is the caller's, so a busy sheet can refuse it. The frame does not close itself; the `visible` prop does. A refused drag settles the sheet back to rest instead of leaving it half dismissed.

The frame's tests cover the title and content, the backdrop close request and that the sheet stays open when the caller refuses, the bottom safe inset, reduced motion, the drag decision, and the sheet and handle test ids. The pan responder itself is the account sheet's, moved unchanged, so the earlier device pass on the drag still applies.

See [`21-see-the-library`](../../specs/21-see-the-library.md).
