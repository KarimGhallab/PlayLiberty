# 06: A horizontal swipe across a track row starts playback

**Status:** resolved
**Labels:** `bug`, `ready-for-agent`
**Source:** [A design critique scores the mobile app 26/40](../../issues/108-a-design-critique-scores-the-mobile-app-26-40.md)

## Outcome

The play layer now measures the touch's travel from its start and refuses to play once it passes 8pt in any direction.
The guard lives on the layer itself (`onTouchStart`, `onTouchMove`), because Pressability still reports a release
inside the row's own bounds as a press; measuring the platform's gesture state would miss exactly the observed case.
The threshold stays under the 12pt a swipe needs to claim a pan, so a scroll that begins on a row still wins.

Reproduced on the emulator before the change: an 80px horizontal drag at 250ms started "Makafushigi Adventure". After
the change the same drag left the playing track untouched, a tap on the same row started it, and a vertical scroll
moved the list without changing playback. The lane and the disclosure are separate pressables and were not touched.

The test fires a tap, a horizontal drag and a vertical drag; only the tap reaches `onPlay`.
