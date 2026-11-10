# 64: The store owns the position contract

**State:** `resolved`
**Category:** `bug`

## Outcome

The store now owns the position bound. `boundedPosition` reads the current track's duration, and both `seek` and `setPosition` go through it; a track with no known duration refuses a seek instead of letting the request through. The keyboard step and the Media Session backward and forward handlers call `seek` with no local clamp, so both forwards stop at the duration.

The apply-once handshake moved into the store: `consumeSeek` returns the pending target and clears it in the same step, replacing `clearSeek`. `PlayerAudio` calls it and only decides whether the element is close enough to skip the write.

`hydrate` validates the stored position against the restored queue. A track that is no longer in `sourceQueue` clears the cursor, an unknown duration starts at zero, and a position outside `(0, duration)` starts at zero. The resume still waits for `loadedmetadata` and clears its one-shot ref after applying.

The store suite covers the bound, a refused seek without duration, the one-shot consume, the reported-position clamp and the rejected resume. The player suite covers the resume applying only once and the Media Session controls stopping at the ends.
