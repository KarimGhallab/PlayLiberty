# 64: The store owns the position contract

**State:** `ready-for-agent`
**Category:** `bug`

**Blocked by:** None. Can start immediately.

## Agent Brief

**Category:** bug
**Summary:** The store's `seek` clamps only below zero and the element's duration never reaches it, so each caller adds the upper bound and the two forwards disagree; a stored position is applied without one.

**Current behavior:**
`seek` clamps one side only: `Math.max(0, seconds)` (`playerStore.ts:287`). The element's duration is not part of the store's interface, so the upper bound is re-implemented by callers and the two that forward a position disagree. The keyboard step clamps against the track's declared duration (`PlayerBar.tsx:80`, `:87`), while the Media Session forward does not (`PlayerAudio.tsx:224`, `seek(positionSeconds + 10)`), so holding the forward control writes a position past the end of the track.

The apply-once handshake is also split. The store writes `seekTo` (`:288`) and exposes `clearSeek` (`:317`), but only `PlayerAudio` ever clears it (`:161`), and the tolerance that decides whether a seek applies is that module's own constant (`SEEK_EPSILON`, `:22`, used at `:157`), so no invariant on the interface says a seek applies once.

Resume is a three-module protocol with no owner: the persistence adapter serialises the position, `hydrate` copies any number into the store without a bound and without checking the restored queue (`playerStore.ts:84-92`), and `PlayerAudio` applies it on `loadedmetadata` (`:118-133`). A position that no longer fits its track is applied blind, and a track whose duration is unknown is dropped so it starts at zero (`PlayerAudio.tsx:107`).

**Desired behavior:**
The store owns the position bound and the apply-once handshake, and the resume rule is one contract: the stored position is validated against the restored queue when it is hydrated, and applied once, on metadata. Every forward, the keyboard step and the pointer alike, goes through the one bound.

**Key interfaces:**

- `seek` clamps against a duration the store can reach, and defers or refuses while none is known.
- A seek applies once, and the store owns clearing the request rather than the audio shell.
- The resume value is validated as part of hydration, so an out-of-range position never reaches the element.

**Acceptance criteria:**

- [ ] The two forward controls stop at the duration.
- [ ] The store's position never exceeds the duration.
- [ ] A stored position that does not fit the restored queue is not applied.
- [ ] A seek applies once across a reload.
- [ ] Tests cover the bound, the apply-once handshake and a rejected resume; the existing player suites keep passing.
- [ ] `pnpm run build`, `pnpm run lint` and the unit suites pass.

**Out of scope:**

- The persistence adapter's storage and flush mechanics.
- The Media Session adapter's feature detection.
- The audio element binding itself.

## Observed

- `seek` clamps only below zero, while the keyboard step clamps at the track's declared duration.
- The Media Session forward seeks to `positionSeconds + 10` with no upper bound.
- `hydrate` copies the stored position without a bound or a queue check.

## Expected

One bound and one apply-once handshake in the store; a validated resume.

## Evidence

- `apps/web/src/shared/player/playerStore/playerStore.ts:84-92`, `:287-288`, `:317`.
- `apps/web/src/shared/player/PlayerBar/PlayerBar.tsx:80`, `:87`.
- `apps/web/src/shared/player/PlayerAudio/PlayerAudio.tsx:22`, `:107`, `:118-133`, `:153-162`, `:223-224`.
- Architecture review 2026-10-16, candidate 6.
