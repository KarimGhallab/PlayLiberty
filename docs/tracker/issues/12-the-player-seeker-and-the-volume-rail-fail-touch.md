# 12: The player seeker and the volume rail fail touch

**State:** `resolved`
**Category:** `bug`

## Outcome

The seeker's target grows to 44px and the volume rail opens on focus and on tap, so a keyboard and a touch user can both seek and set the level. The seeker keeps its 4px track and carries a transparent `::before` inset `-20px 0`, the pattern the transport's steps already use, and the volume control opens the rail on focus, on the pointerdown and on hover and holds it while focus is inside, with a `hovering` ref keeping the paths from closing each other. Measured in the browser: at 390 the seeker box is 160x4 with a 160x44 target and at 1280 it is 480x4 (a 480x44 target); the rail is 4x96 with `::before` `left/right -20px` (a 44px-wide target), and a pointerdown a quarter down it sets the level to 75. The mute button keeps its behavior and the drawn geometry (the 4px track, the 12px knob, the rail's 4x96) is unchanged.
