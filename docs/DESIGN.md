# Design System: PlayLiberty

## Overview

A calm, dark-only, content-forward music library. It should read as a dependable personal
shelf, not a video feed and not a gamer dashboard.

The foundations below are decided and measured. The components are not yet designed, and
this document does not pretend otherwise: see [Components](#components) for what is still open.

The values live in [`docs/design/tokens.css`](design/tokens.css) and nowhere else. That file is
the contract that `10-build-design-foundation` transcribes into `packages/tokens`, so this
document and the specimens describe the design while `tokens.css` defines it. Where the two
disagree, `tokens.css` is right and this document is stale.

## Colour

Dark only, there is no light theme. Instrument black, one deep green telltale, one amber telltale
kept rare, and album art as the only large field of colour.

| Token              | Value                       | Role                                     |
| ------------------ | --------------------------- | ---------------------------------------- |
| `--bg`             | `#0b0d10`                   | the page                                 |
| `--surface`        | `#14171b`                   | rows, cards, panels                      |
| `--surface-raised` | `#1c2025`                   | the player bar, one step up              |
| `--ink`            | `#e6e9ea`                   | primary text                             |
| `--muted`          | `#8b9299`                   | durations, timestamps, counts            |
| `--line`           | `rgba(255, 255, 255, 0.09)` | hairlines and separators                 |
| `--accent`         | `#2f9e7e`                   | primary action, focus ring, active state |

Every value is a named object in one scene: the unlit anodised face of a head unit, the panel
around an unlit key, the bezel lip, an LCD backlight at night, the gap between two panels, and
the green telltale. The accent is deep and low-chroma on purpose. An electric teal on charcoal
is the overused default this system exists to avoid, and a genuinely teal accent was measured
and rejected: at this depth it cannot clear AA on the raised surface.

### Contrast

Every text pairing clears WCAG AA, and the ratio is computed from the two values rather than
judged by eye. `docs/design/scripts/validate-design-tokens.cjs` recomputes 27 pairings and
fails the build if any required pairing drops below the AA threshold of 4.5, so these
numbers cannot rot.

| Pairing                       | On `--bg` | On `--surface` | On `--surface-raised` |
| ----------------------------- | --------- | -------------- | --------------------- |
| `--ink`                       | 15.94:1   | 14.73:1        | 13.42:1               |
| `--muted`                     | 6.18:1    | 5.71:1         | 5.20:1                |
| `--accent`                    | 5.85:1    | 5.40:1         | 4.92:1                |
| `--bg` on `--accent` (legend) | 5.85:1    |                |                       |

An accent control carries a near-black legend, never a light one. Light on the green accent is
2.73:1 and is the pairing this system forbids; a specimen shows it failing on purpose, at full
strength, because dimming the whole control would demonstrate nothing about the contrast inside
it.

### Track state tones

One tone per display state, and every state carries a label, so colour never works alone.

| Token                | Value             | State       | Meaning                                                 |
| -------------------- | ----------------- | ----------- | ------------------------------------------------------- |
| `--tone-pending`     | `#84948a`         | Pending     | queued, nothing to report yet                           |
| `--tone-downloading` | `var(--emphasis)` | Downloading | in progress, borrowing the emphasis amber               |
| `--tone-stored`      | `#e6e9ea`         | Stored      | playable, the resting backlight so it reads as no news  |
| `--tone-failed`      | `#e0625e`         | Failed      | a download failed and will retry, so it is the loud one |
| `--tone-unavailable` | `#b87570`         | Unavailable | the video cannot be fetched and never will              |
| `--tone-removed`     | `#8b9299`         | Removed     | gone from the source, retained and still playable       |

`failed` and `unavailable` are both bad news but not the same urgency, and they do not share a
hue: a failed download is retried on the next refresh, an unavailable video never will be, so
`unavailable` is stepped down in both chroma and lightness. `--tone-unavailable` on
`--surface-raised` is 4.53:1, the tightest pairing in the system. That thinness is deliberate
and the validator guards it.

A removed track takes the removed tone whatever its file status is. That precedence belongs to
`packages/ui-foundation`, which maps a track's file and source status to a tone.

**The interactive accent stays out of the fault vocabulary.** Green and red are the classic
colour vision collision, and at similar lightness only hue separates them. So green means what
you can act on, amber means what is happening, and red means what broke.

## Typography

One family, IBM Plex Sans, for everything including numbers. Self-hosted, never a CDN, because
the deployment is private. It is a variable font covering 400 to 600 in a single 45 KB file, so
the weight axis is `font-weight` alone and no weight costs an extra request.

A second family was drafted in and then removed, and the reason is worth keeping. It had been
justified as the thing that made a duration column align. Measured in the browser at a 1000px
em, Plex Sans has tabular figures by default: every digit 0 to 9 has an advance of 600, the
same as a monospace face, while M and I are 812 and 400. A duration column therefore aligns with
no second family and without depending on any font feature being honoured, which also settles
the mobile question, since nothing needs `fontVariant` to work on Android. The measurement
lives in `docs/design/foundations/type.html` so the decision is not re-argued on a hunch.

| Token        | Value | Role                                                           |
| ------------ | ----- | -------------------------------------------------------------- |
| `--text-xs`  | 12px  | state labels, timestamps, counts. The floor.                   |
| `--text-sm`  | 14px  | track titles. The workhorse, and the scale is built around it. |
| `--text-md`  | 16px  | body copy, the first size comfortable for a sentence           |
| `--text-lg`  | 20px  | empty-state heading, and screen titles on mobile               |
| `--text-xl`  | 24px  | playlist name                                                  |
| `--text-2xl` | 32px  | screen title on web only; 32px does not fit a 390px canvas     |

The lower three sit 2px apart and read as a close pair, which is honest: they are metadata, a
title and a sentence. The upper three step by 4, 4 and 8. An earlier draft carried 12, 13, 14
and 15 and the bottom four read as a single size, so a one-pixel step is not a step.

Three weights and no more: `--weight-regular` 400, `--weight-medium` 500 for counts and
emphasised metadata, `--weight-semibold` 600 for screen and playlist titles. Leading is a
unitless ratio so the web can use it directly and mobile can multiply it by its own size:
`--leading-tight` 1.2, `--leading-normal` 1.35, `--leading-relaxed` 1.5.

Whether 12px is comfortable is a judgement no ratio can settle, and it was made against the
real font rather than a fallback.

## Space

Nine steps in three bands. A spacing scale exists to create grouping, not to fill space;
distance is the only hierarchy cue that costs nothing.

| Band      | Steps                                                          | For                                                |
| --------- | -------------------------------------------------------------- | -------------------------------------------------- |
| Tight     | `--space-1` 4, `--space-2` 8                                   | inside a control, icon to label                    |
| Working   | `--space-3` 12, `--space-4` 16, `--space-5` 20                 | where a list lives, so most of the app is set here |
| Breathing | `--space-6` 24, `--space-7` 32, `--space-8` 40, `--space-9` 48 | letting a block stand alone, rare on purpose       |

Repeated rows use fixed-width slots for the state indicator, the trailing action and the
duration, so the lanes line up regardless of content. A gap alone does not align anything.

## Shape

`--radius-artwork` 4px for album art, square and barely softened so a grid of covers reads as
one surface. `--radius-control` 6px for buttons and inputs. `--radius-card` 10px for cards, the
player bar and the empty state. `--radius-chip` 999px is the only pill in the system, and only
for a genuine filter chip.

## Depth

Depth comes from the surface step and the hairline, never from a shadow. No glow, no
glassmorphism, no drop shadow heavier than a subtle lift on the player bar.

## Motion

Transitions only, and restrained: no keyframes, no decorative loops, no page transitions.
`--motion-fast` 120ms for hover, focus and the lamp coming on. `--motion-base` 180ms for a state
change a row can show. `--motion-slow` 240ms for the player bar and nothing else.

A `prefers-reduced-motion: reduce` rule drops all three to zero. The player bar additionally
drops artwork transitions, seek smoothing and hover scale, while keeping the position indicator
and the focus ring, which carry information rather than decoration.

## Focus and stacking

The focus ring is the accent at `--focus-width` 2px with a `--focus-offset` 2px, so it reads on
every surface including the raised one at 4.92:1. The ring colour is `--accent` and
deliberately not a second token, so the accent cannot be changed in one place and not the
other.

Four stacking levels and no more, so a z-index argument never happens: `--z-base` 0,
`--z-sticky` 10, `--z-overlay` 20, `--z-player` 30.

## Layout

Still a principle rather than a specification. Single column on mobile, a fixed sidebar plus
content on web, a comfortable reading width, and a persistent player bar anchored to the
bottom. The two playlist screens have not been drawn yet, so this section describes intent and
nothing has been measured.

## Components

The inventory is decided and the designs are not. These are the components, not their specs:

- **Track row**, the core unit that appears in every list. It has to express a state space of
  two independent axes: `TrackFileStatus` carries pending, downloading, stored, failed and
  unavailable, and `TrackSourceStatus` carries available and removed, so five by two. It also
  has to absorb three cases the schemas permit and a state list would miss: `thumbnailPath` is
  nullable, `durationSeconds` is nullable, and `failureReason` is a non-null string with no
  length bound.
- **Player bar**, persistent across the app.
- **Empty state**, shown before the first sync, which is also the state where `lastSyncedAt` is
  still null.
- **Playlist header**, the playlist's identity: cover, name, sync status, last synced.
- **Sync summary**, the outcome of the last run. A different record with a different lifetime
  from the playlist, which is why it is a component of its own, and it gives `retainedCount` a
  deliberate position rather than one item in a list of counts.
- **Sync error**, because `PlaylistSyncStatus.Error` and a non-null `SyncRun.error` are both
  reachable. A failed sync is exactly when the user needs to know, and exactly where "do not
  nag" could tempt a designer into silence.

## Form controls

`docs/design/components/form-controls.html` draws the primitives. Four decisions in it were
forced by measurement rather than taste, and each of them replaced an earlier answer that looked
right and did not work.

**A control boundary is not a hairline.** `--line` measures 1.28:1 on `--surface` and is right for
separating rows from each other, which is a job it does well. It is wrong for outlining something
you can click: the track row's action lane was drawn with it and the control was effectively
invisible. `--control-border` at `#6e7379` measures 3.42:1 on `--surface-raised`, 3.76:1 on
`--surface`, and is the 3:1 WCAG 1.4.11 asks of a control boundary. The value shipped is not the
one first chosen by eye; the first one measured 2.21:1 on `--surface`, which is a hairline by
another name. It is checked by the suite at 3:1, which is a different rule from the text rule and
catches a different mistake: a colour can pass every text pairing in this system and still be too
faint to see a checkbox by.

**A disabled control is measured, not faded.** `--opacity-disabled` at 0.45 drags the label down
with the control, to 3.93:1 for ink and 2.15:1 for a muted label, both under AA. So disabled has
its own pair. `--control-disabled-fg` is ink at 55%, which is 5.24:1 on `--surface` and 4.65:1 on
its own fill. The fill is the lightest value that still reads as a filled object at all: darker
options measure 1.07:1 and 1.13:1 against the surface, but a darker fill also drops the label,
to 4.42:1 and 4.15:1, so the darker options fail on the text they are supposed to carry. A
disabled fill is deliberately absent from the 3:1 check, because 1.4.11 exempts inactive
components and a dead control that looks live is worse than one that looks dead.

**Hover lifts the accent; it never changes hue.** The primary button used to go to
`--tone-downloading` on hover, which was wrong in a way that only showed up once amber was
also given a job. The accent deliberately stays out of the progress and fault vocabulary so the
three never get confused, and a hover that turns the action colour into the progress colour means
the same control changes meaning depending on where the pointer is. `--accent-hover` is the
accent lifted, same hue at 1.24x the luminance, and the near-black legend gets _better_ rather
than worse: 7.05:1 against the resting 5.85:1, because dark ink on a lighter fill is more
contrast, not less. It applies to a pressable accent fill, which is the primary button and the
switch. It does not apply to a checked box, because that fill is a state rather than an
invitation to press, and a state that moves when the pointer crosses it stops being a state you
can read at rest.

**Amber is the second colour, and it is a statement rather than a state.** It is `--emphasis`,
and the downloading tone is declared as that value rather than owning one:
`--tone-downloading: var(--emphasis)`. One declaration, two names, so the two cannot drift
apart. The dependency points that way on purpose, because "in progress" is a mild form of "needs
attention" and emphasis is the broader of the two ideas. A state borrowing a colour is ordinary;
a colour borrowing a state name is the thing this system exists to avoid, which is exactly what
the amber hover had done. The two can share a value because they never compete: download
concurrency is capped at 2, so at most two rows are ever downloading at once and neither is the
emphasis. Had that cap been 20, amber could not have been both, because a screen full of
downloading rows would leave the emphasis with nothing to stand out from. It measures 8.30:1 on
`--bg`
and 6.98:1 on `--surface-raised`, and a filled badge puts `--bg` on it at the same 8.30:1. Three
rules hold it together: one emphasis per view, or the emphasis is the background; always with a
word, never the colour alone; and never on a hover, which is the mistake above. Amber on a
notice's rule and its mark is right. Amber on the notice's sentence as well is wrong, because
once the body copy is tinted it stops being the thing being pointed at.

**A busy control is not a disabled one.** This was a mistake in the first draft, where a syncing
button shared a rule with the disabled buttons and greyed out the instant it was pressed, which
reads as a refusal. Busy keeps the variant's own colours and gains a spinner, and the spinner is
`currentColor` so it is legible on any fill without a per-variant colour to keep in step. Under
`prefers-reduced-motion: reduce` the ring stops turning and its cut top comes back, because a
frozen ring with a notch reads as broken; the word is what carries the state.

**The segmented control has no fill on its selected option.** This is the one that could not be
solved by picking a better colour. The obvious build fills the selection, and it fails here.
Filling it with `--surface-raised` inside a `--bg` track measures 1.19:1, and inside the dialog it
collapses to 1.00:1 because the track was already the dialog's own fill, so the selection
disappeared exactly where it mattered most. Lifting the fill does not rescue it either: every dark
grey in this palette sits between 1.15:1 and 1.80:1 against these surfaces, and a grey strong
enough to read starts failing the label on it, since `--muted` on `#333941` is 3.70:1 and on
`#424951` is 2.90:1. The dark end of this palette has no room for a fill. The selection is
therefore a rule under the option plus a step from `--muted` to `--ink`: a shape and a contrast,
so the state survives greyscale and never depends on judging a shade.

**A text input is the one control with no focus ring.** It had two, and they were nested: one
drawn around the whole field block by `:focus-within`, which boxed in the label and any message
along with the input, and one around the input itself. The border carries focus instead, shifting
from `--control-border` to `--accent`. That is a hue shift from a desaturated grey to the accent
rather than only a lightness one, it clears 3:1 on the input's own fill at 5.85:1 against the
unfocused 4.07:1, and the caret is in the field. It is a weaker signal than a 2px offset ring and
that is a deliberate trade for the look. The alternative was no focus indicator at all, which
fails WCAG 2.4.7 outright.

Three smaller rules that fall out of the same reasoning. A checked box is filled with the accent
rather than the ink, because the accent is the colour this system already means "you can act on
this", and the near-black mark on it is 5.85:1. An invalid input does not turn its text red: the
text stays ink so it can be read and corrected, and the red goes on the border and on a message
that says what to do about it. And the scrim is one colour, `--scrim`, rather than a black plus an
alpha, because a composable opacity would let a consumer invent a scrim nobody decided on, and a
bare `0.6` cannot be read on its own in the token file.

For `ShareLevel` the product uses the segmented control, not a radio. Sharing is a permission the
owner sets once and reads back every time they look at the share list, not a form that gets
posted and forgotten, and a segmented control shows both permissions side by side with the
consequence spelled out under each. Radio stays in the system for choices that really are a form
submission, and it is drawn in the specimen so that is a decision rather than an omission.

Touch targets are separate from control size. `--control-height` is 36px, comfortable on a
desktop and too small for a thumb, so anything tappable on mobile sits inside `--control-touch` at
44px. The checkbox row does this by padding rather than by growing the box, so a control looks the
same size on both platforms and only its target differs.

## Do's and Don'ts

- Do keep the library, not the source video, at the centre of the interface.
- Do make sync state legible, and carry it in a label as well as a colour. The user should
  know a removed video was retained.
- Do measure a contrast ratio rather than trust your eye.
- Don't gamify or nag.
- Don't use a bright, saturated palette. Album art supplies the colour, and the only other colours
  on the page are the accent and one emphasis.
- Don't ship a video-feed metaphor. This is a music library.
- Don't add a second typeface without measuring whether the first already does the job.

## Changing a value

Edit `docs/design/tokens.css`, then run:

```
node docs/design/scripts/validate-design-tokens.cjs
```

It runs ten checks. `tokens.css` holds nothing but custom property declarations. No specimen
hard-codes a colour a token already carries. No `:hover` rule paints with a tone token, which is
the one mistake in this file that no ratio can catch and so has to be forbidden outright. Every
text pairing clears AA at 4.5:1. Every control boundary clears 3:1. Every ratio printed on a
specimen still matches. Nothing references a token that no longer exists. Every ratio quoted in
this file still matches. Every relative link in the tree resolves to a file that exists, which is
why the index marks what is unbuilt as text rather than linking it.

It also holds the rejected candidates at their measured values. Those cannot fail the run, because
they are values that were tried and ruled out, and their only job is to hold a figure steady so a
document can honestly say what the alternatives were. The known-bad pairings are
declared with a `FORBIDDEN` prefix and are measured but do not fail the run, so the value the
system ruled out stays recorded instead of quietly becoming legal again. While task `09` is open the stylesheet is authoritative. Once
`10-build-design-foundation` lands, `packages/tokens` is authoritative, the emitter writes the
stylesheet the web client loads, and the specimens become a dated snapshot of what was decided.

The specimens themselves are in `docs/design/`, one file per subject, and they are not the
implementation. The component specimens contain flexbox that the real React and React Native
components will not share, because the two runtimes lay out differently. The specimens
illustrate; this document specifies.
