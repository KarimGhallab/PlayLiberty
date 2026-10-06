# 12: The player seeker and the volume rail fail touch

**State:** `resolved`
**Category:** `bug`

## Agent Brief

**Category:** bug
**Summary:** The player bar's seeker is a 4px-tall pointer target, and the volume rail exists only while hovered, so a touch user cannot seek and can only mute.

**Current behavior:**
The seeker is a `role="slider"` element whose box is 4px tall with no expanded hit area, so the target a pointer or a thumb must hit is the visible track: measured 480×4 on the desktop and 160×4 at 390. The transport's step buttons solve the same problem with a transparent `::before` inset that grows a 32px box to 44px; the seeker has no equivalent.

The volume rail is rendered only while the volume control's `open` state is true, and `open` is set by `onMouseEnter` on the control. On a touch device there is no hover, so the rail never enters the DOM, cannot be tapped, and cannot be focused; the only way to change the level is the window-level Up/Down/M shortcuts, which are keyboard-only. A touch user can therefore mute but never set a level.

**Desired behavior:**
The seeker's pointer and touch target is at least 44px tall while its visible track stays 4px, using the same transparent-extension pattern the step buttons already carry. The volume rail opens on focus and on tap and stays while focus is inside it, so a keyboard user and a touch user can both set the level; the mute button keeps its current behavior. The drawn geometry (the 4px track, the 12px knob, the rail's 4×96) is unchanged.

**Key interfaces:**

- The seeker slider element in the player bar.
- The volume control's `open` state and its hover handlers; it must also answer focus and pointer/tap.
- The existing `::before` target-extension pattern in the player bar's step buttons and the playlist header's quiet controls.

**Acceptance criteria:**

- [x] The seeker's pointer/touch target is at least 44px tall, verified by the expanded box, while the visible track stays 4px.
- [x] The volume rail is reachable and operable by keyboard: focus opens it and it stays while focus is inside.
- [x] The volume rail opens on tap and can be dragged to set the level at a touch viewport.
- [x] The visible geometry of the seeker and the rail is unchanged.
- [x] Tests cover the seeker's target and the rail's focus-open behavior.
- [x] `pnpm run build`, `pnpm run lint` and the unit suites pass.

**Out of scope:**

- The window-level Up/Down/M shortcuts, which stay.
- The mute button's behavior.
- A redesign of the player bar or its layout.

## Outcome

Done. The seeker's target grows to 44px and the volume rail opens on focus and on tap, so a keyboard and a touch user can both seek and set the level.

- The seeker keeps its 4px track and carries a transparent `::before` inset `-20px 0`, the pattern the transport's steps already use, so its pointer/touch box is 44px tall while the drawn track stays 4px.
- The volume control opens the rail on focus, on the pointerdown and on hover, and holds it while focus is inside. A tap opens the rail on the pointerdown itself rather than leaning on the mouseenter a touch browser may never synthesize. A `hovering` ref keeps the paths from closing each other: the panel survives a focusout while the pointer is still on the pair, and survives a mouseleave while focus is inside.
- The mute button keeps its behavior; the drawn geometry (the 4px track, the 12px knob, the rail's 4x96) is unchanged.

Measured in the browser: at 390 the seeker box is 160x4 with `::before` `top/bottom -20px` (a 160x44 target); at 1280 it is 480x4 (a 480x44 target). The bar stays 98px and there is no horizontal overflow. Focusing the mute mounts the rail (4x96, `::before` `left/right -20px`, a 44px-wide target); a pointerdown a quarter down the rail sets the level to 75; focus leaving the control unmounts it; a pointerdown on the mute opens it from closed.

Verification: `pnpm run build`, `pnpm run lint`, and the unit suites (server 275, web 356). The rail's focus-open, focus-hold, focus-leave and tap-open are unit-tested in `VolumeControl.test.tsx`. The seeker's target is CSS geometry that jsdom cannot measure, so it is verified live and the existing `PlayerBar.test.tsx` seek test covers the interaction. Not committed.

## Observed

- The seeker: `role="slider"`, `height: 4px`, no expanded target; measured 480×4 at 1280 and 160×4 at 390.
- The volume rail: not rendered at 390 (`volumePanelRendered: false`); its panel is gated on a hover-only `open` state.
- The step buttons already carry `::before { inset: -6px }`, growing 32px to 44px; the header's quiet controls do the same under the mobile query. The seeker and the rail do not.

## Expected

Every primary pointer control reaches the 44px target the app already applies to the transport and the header controls. The seeker grows its target invisibly; the volume rail gains a focus and tap path so it is not hover-only.

## Evidence

- Live measurement at 1280 and 390: seeker 4px tall, no `::before`; volume panel absent without hover.
- Impeccable audit, P1 "Player seeker and volume rail fail touch" (WCAG 2.5.8).
- In-repo precedent: `PlayerBar.module.scss` `__step::before` and `PlaylistHeader.module.scss` `__icon-btn::before`.
