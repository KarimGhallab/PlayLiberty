# 04: The section in the specimen and the two glyphs in the pinned set

**Blocked by:** None. Can start immediately.
**Status:** open
**Labels:** `enhancement`, `ready-for-agent`

## Objective

The design record's drawing catches up with its prose: the library specimen draws the pinned section and the
pin on the cover in its states, and the two glyphs join the pinned set the validator checks, so the record, the
specimen and the icon pin agree and `design:check` stays green.

## Context

Read the library record's section on the pinned section and the pin on the cover. Glyphs come from one pinned
release, and a specimen's copy has to match that release's own path data exactly, because the validator holds
the data and fails a copy that differs. The record's figures come from its own specimen, which is why this is
work in the set rather than a follow-up to it.

## Scope

- **The library specimen draws the pinned section**: the heading, the section's own list above the gallery's,
  and the separation the record names.
- **It draws the pin on the cover in each state the record names**: revealed and unpinned, visible at rest while
  pinned, and under the pointer while pinned.
- **The pinned-glyph table gains both glyphs**, `pin` and `pinned-off`, with the release's path data verbatim,
  and an optical entry for either one if the measurement says one is owed.
- **The icons record gains its entry for the pair**, saying which of the two is the state, which is the action,
  and why those are the two.

## Out of scope

The code, which is `02` and `03`. Any figure the record does not already name.

## Verification

- `pnpm run design:check` passes, with both glyphs counted, no dangling token, no stale ratio, and no dead link
  added.
- The specimen draws every state the record names, and the glyphs in it are the release's own geometry.
