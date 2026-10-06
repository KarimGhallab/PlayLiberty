# 02: The shuffle control reports pressed on every playlist

**State:** `needs-triage`
**Category:** `bug`

## Observed

Every row in the library draws its shuffle button as a toggle, and every one of them reports
`aria-pressed="true"` and the accent fill the moment any queue is shuffled. Pressing Shuffle on one
playlist turns all of them on.

`PlaylistListItem` reads the player's single global flag and hands it to every shared header:

- [`PlaylistListItem.tsx:61`](../../../apps/web/src/views/library/PlaylistListItem.tsx)
  `const shuffled = usePlayerStore(state => state.shuffle);`
- [`PlaylistListItem.tsx:79`](../../../apps/web/src/views/library/PlaylistListItem.tsx) passes
  `shuffled={shuffled}` for every item.
- [`PlaylistHeader.tsx:457`](../../../apps/web/src/shared/components/PlaylistHeader/PlaylistHeader.tsx)
  `aria-pressed={shuffled}`.

The store's `shuffle` is one boolean for the queue, not a per-playlist fact, so with three playlists in
the gallery all three toggle on together.

## Expected

The control's state is about the playlist it belongs to: a row is pressed only while the queue is that
playlist _and_ shuffle is on, and every other row is unpressed. A screen-reader user must be able to tell
which playlist is playing from the toggles alone.

The alternative, if the press is really "start this playlist, shuffled" rather than a mode toggle, is a
plain action button with no `aria-pressed` at all. The item's own comment says the press starts a queue
from tracks this screen has not read, so the toggle semantics may be the wrong shape to begin with.

## Evidence

- Live, 2026-10-05: seeded three playlists (Focus, Late Night Drive, Evening Jazz), pressed Shuffle on
  Focus, and all three rows turned accent and all three buttons reported pressed.
- `usePlayerStore` exposes one `shuffle` boolean and one current playlist id; the id is already available
  to compare against `playlist.id`.
- Critique run `views-library-librarypage-librarypage-tsx-a51b86be`, Priority Issue P1 (Nielsen heuristics
  1 and 4).
