# 12: The player seeker and the volume rail fail touch

**State:** `resolved`
**Category:** `bug`

## Outcome

Done. The seeker's target grows to 44px and the volume rail opens on focus and on tap, so a keyboard and a touch user can both seek and set the level.

- The seeker keeps its 4px track and carries a transparent `::before` inset `-20px 0`, the pattern the transport's steps already use, so its pointer/touch box is 44px tall while the drawn track stays 4px.
- The volume control opens the rail on focus, on the pointerdown and on hover, and holds it while focus is inside. A tap opens the rail on the pointerdown itself rather than leaning on the mouseenter a touch browser may never synthesize. A `hovering` ref keeps the paths from closing each other: the panel survives a focusout while the pointer is still on the pair, and survives a mouseleave while focus is inside.
- The mute button keeps its behavior; the drawn geometry (the 4px track, the 12px knob, the rail's 4x96) is unchanged.

Measured in the browser: at 390 the seeker box is 160x4 with `::before` `top/bottom -20px` (a 160x44 target); at 1280 it is 480x4 (a 480x44 target). The bar stays 98px and there is no horizontal overflow. Focusing the mute mounts the rail (4x96, `::before` `left/right -20px`, a 44px-wide target); a pointerdown a quarter down the rail sets the level to 75; focus leaving the control unmounts it; a pointerdown on the mute opens it from closed.

Verification: `pnpm run build`, `pnpm run lint`, and the unit suites (server 275, web 356). The rail's focus-open, focus-hold, focus-leave and tap-open are unit-tested in `VolumeControl.test.tsx`. The seeker's target is CSS geometry that jsdom cannot measure, so it is verified live and the existing `PlayerBar.test.tsx` seek test covers the interaction. Not committed.
