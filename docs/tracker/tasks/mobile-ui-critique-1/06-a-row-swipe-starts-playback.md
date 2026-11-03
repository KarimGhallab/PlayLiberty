# 06: A horizontal swipe across a track row starts playback

**Status:** resolved
**Labels:** `bug`, `ready-for-agent`
**Source:** [A design critique scores the mobile app 26/40](../../issues/108-a-design-critique-scores-the-mobile-app-26-40.md)
**Blocked by:** None. Can start immediately.

## Observed

A horizontal drag over a track row starts that track. It happened by accident during the 2026-11-03 review while
trying to scroll the list. The row's play layer is a `Pressable` stretched across the whole row, and the row carries
no guard against a drag that begins and ends as one.

## Expected

A press plays; a drag scrolls. A gesture that moves horizontally or vertically past a small threshold does not
activate the row, and this holds while the list scrolls under the finger.

## Evidence

- `apps/mobile/src/views/playlist/TrackRow/TrackRow.tsx`: the play layer is a pressable spanning the row.
- The critique run: a horizontal swipe on a row of "Chine" started playback; the player bar's track changed and the
  row took the playing ground.
- `docs/DESIGN.md`, "The settled arrangements": "A track row is one target. The whole row plays."

## Acceptance criteria

- [x] Reproduced on the emulator before the change, and absent after.
- [x] A tap plays; a vertical scroll never plays; a horizontal drag never plays.
- [x] The lane and the details control keep their own presses.
- [x] A test covers the drag threshold, or a comment records why the platform press already cancels it and the
      observed case cannot occur.

## Outcome

The play layer now measures the touch's travel from its start and refuses to play once it passes 8pt in any direction.
The guard lives on the layer itself (`onTouchStart`, `onTouchMove`), because Pressability still reports a release
inside the row's own bounds as a press; measuring the platform's gesture state would miss exactly the observed case.
The threshold stays under the 12pt a swipe needs to claim a pan, so a scroll that begins on a row still wins.

Reproduced on the emulator before the change: an 80px horizontal drag at 250ms started "Makafushigi Adventure". After
the change the same drag left the playing track untouched, a tap on the same row started it, and a vertical scroll
moved the list without changing playback. The lane and the disclosure are separate pressables and were not touched.

The test fires a tap, a horizontal drag and a vertical drag; only the tap reaches `onPlay`.
