# Design System: PlayLiberty

## Overview

No user interface exists yet. This records the intended direction so the first client does not start from a blank slate: a calm, dark-only, content-forward music library. It should read as a dependable personal shelf, not a video feed and not a gamer dashboard. The exact tokens below are provisional and are expected to change when the first client is built; treat the principles as the stable part.

## Colors

Dark only. Restrained, low-saturation surfaces so album art carries the color. The tokens are implemented as CSS custom properties on `:root`, with `color-scheme: dark` so the browser chrome matches.

| Token       | Value                    | Use                           |
| ----------- | ------------------------ | ----------------------------- |
| `--bg`      | `#0f1115`                | page background               |
| `--surface` | `#171a21`                | cards, lists, player bar      |
| `--ink`     | `#e8eaf0`                | primary text                  |
| `--muted`   | `#9aa0ae`                | secondary text, timestamps    |
| `--line`    | `rgba(255,255,255,0.08)` | hairlines, separators         |
| `--accent`  | `#4f8cff`                | primary actions, active state |

## Typography

| Role    | Font family                                            | Details                    |
| ------- | ------------------------------------------------------ | -------------------------- |
| UI      | system-ui, -apple-system, Segoe UI, Roboto, sans-serif | body and controls          |
| Title   | same stack, 600 weight                                 | screen and playlist titles |
| Numeric | system stack, `tabular-nums`                           | durations, timestamps      |

## Layout

Single column on mobile; a fixed sidebar plus content area on web. Comfortable reading width, generous vertical rhythm in lists, and a persistent player bar anchored to the bottom.

## Elevation & Depth

Depth comes from surface color and hairlines, not heavy shadows. No glow, no glassmorphism, no drop shadows thicker than a subtle lift on the player bar.

## Shapes

Small, consistent radii (about 6px on controls, 10px on cards). Hairline strokes for separation. No pill-shaped buttons unless a control is genuinely a filter chip.

## Components

- **Track row** - the core unit: title, playlist, duration, primary action. Appears in every list.
- **Player bar** - persistent across the app; shows the current track and transport.
- **Playlist view** - a source playlist with its sync state: last synced, pending, and removed videos that were retained.
- **Empty state** - shown before the first sync; explains the one action that matters.

## Browser surfaces

Style focus rings to be visible against the dark surfaces. Use the accent for selection and active states. Style scrollbars minimally to avoid bright default chrome on dark backgrounds.

## Motion

Motion is CSS transitions only and stays restrained: no page transitions and no decorative loops. A global `prefers-reduced-motion: reduce` rule disables transitions and animations, and the player bar additionally drops artwork transitions, seek smoothing, and hover scale while keeping the position indicator and focus rings, which carry information rather than decoration.

## Do's and Don'ts

- Do keep the library, not the source video, at the center of the interface.
- Do make sync state legible; the user should know a removed video was retained.
- Don't gamify or nag.
- Don't use a bright, saturated palette; let album art supply the color.
- Don't ship a video-feed metaphor; this is a music library.
