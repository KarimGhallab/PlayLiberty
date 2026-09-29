# Colour

> Part of the design system. Index and cross-cutting rules: [`DESIGN.md`](../DESIGN.md).

Dark only, there is no light theme. Instrument black, one deep green telltale, one amber telltale kept
rare, and album art as the only large field of colour.

| Token              | Value                       | Role                                     |
| ------------------ | --------------------------- | ---------------------------------------- |
| `--bg`             | `#0b0d10`                   | the page                                 |
| `--surface`        | `#14171b`                   | rows, cards, panels                      |
| `--surface-raised` | `#1c2025`                   | the player bar, one step up              |
| `--ink`            | `#e6e9ea`                   | primary text                             |
| `--muted`          | `#8b9299`                   | durations, timestamps, counts            |
| `--line`           | `rgba(255, 255, 255, 0.09)` | hairlines and separators                 |
| `--accent`         | `#2f9e7e`                   | primary action, focus ring, active state |

Every value is a named object in one scene: the unlit anodised face of a head unit, the panel around an
unlit key, the bezel lip, an LCD backlight at night, the gap between two panels, and the green
telltale. The accent is deep and low-chroma on purpose. An electric teal on charcoal is the overused
default this system exists to avoid, and a genuinely teal accent cannot clear AA on the raised surface
at this depth.

## Contrast

Every text pairing clears WCAG AA, and the ratio is computed from the two values rather than judged by
eye. `docs/design/scripts/validate-design-tokens.cjs` recomputes 35 pairings and fails the build if any
required pairing drops below the AA threshold of 4.5, so these numbers cannot rot.

| Pairing                       | On `--bg` | On `--surface` | On `--surface-raised` |
| ----------------------------- | --------- | -------------- | --------------------- |
| `--ink`                       | 15.94:1   | 14.73:1        | 13.42:1               |
| `--muted`                     | 6.18:1    | 5.71:1         | 5.20:1                |
| `--accent`                    | 5.85:1    | 5.40:1         | 4.92:1                |
| `--bg` on `--accent` (legend) | 5.85:1    |                |                       |

An accent control carries a near-black legend, never a light one. Light on the green accent is 2.73:1
and is the pairing this system forbids; a specimen shows it failing on purpose, at full strength, because
dimming the whole control would demonstrate nothing about the contrast inside it.

## Track state tones

One tone per display state, and every state carries a label, so colour never works alone.

| Token                | Value             | State       | Meaning                                                 |
| -------------------- | ----------------- | ----------- | ------------------------------------------------------- |
| `--tone-pending`     | `#84948a`         | Pending     | queued, nothing to report yet                           |
| `--tone-downloading` | `var(--emphasis)` | Downloading | in progress, borrowing the emphasis amber               |
| `--tone-stored`      | `#e6e9ea`         | Stored      | playable, the resting backlight so it reads as no news  |
| `--tone-failed`      | `#e0625e`         | Failed      | a download failed and will retry, so it is the loud one |
| `--tone-unavailable` | `#b87570`         | Unavailable | the video cannot be fetched and never will              |
| `--tone-removed`     | `#8b9299`         | Removed     | gone from the source, retained and still playable       |

`failed` and `unavailable` are both bad news but not the same urgency, and they do not share a hue: a
failed download is retried on the next sync, an unavailable video never will be, so `unavailable` is
stepped down in both chroma and lightness. `--tone-unavailable` on `--surface-raised` is 4.53:1, the
tightest pairing in the system. That thinness is deliberate and the validator guards it.

A removed track takes the removed tone whatever its file status is. That precedence belongs to
`packages/ui-foundation`, which maps a track's file and source status to a tone.

**The interactive accent stays out of the fault vocabulary.** Green and red are the classic colour
vision collision, and at similar lightness only hue separates them. So green means what you can act on,
amber means what is happening, and red means what broke.
