# 19: One cache-effect map

**State:** `ready-for-agent`
**Category:** `enhancement`

**Blocked by:** None. Can start immediately.

## Agent Brief

**Category:** enhancement
**Summary:** The invalidation keys are restated in every mutation's `onSuccess` and again in the live-event path, and the same "playlist is gone" fact is answered two ways (`removeQueries` in the delete mutation, `resetQueries` in the live-event path).

**Current behavior:**
Each of the eleven mutations writes its own invalidation block, restating the query keys. The live-event path restates the same keys for the events the server sends, so the same server fact is invalidated twice by two lists that must agree by hand. For a playlist removal the two paths disagree on the primitive: the deleting client removes the query, the live-event path resets it, with a comment explaining that a reset is needed for an active observer.

**Desired behavior:**
One module maps a domain fact (a playlist changed, a playlist was removed, a track changed) to the query keys it invalidates and the primitive it uses. Both the mutations and the live-event path call it, so the keys and the primitive agree. The observable cache behaviour is unchanged, except that a removal takes one primitive on both paths.

**Key interfaces:**

- The map's interface takes a domain fact and the query client, or returns the effects for the caller to apply; either way it is the one place the keys are written.
- The mutations stop writing key literals; they name the fact.
- The live-event path names the fact per event type.

**Acceptance criteria:**

- [ ] One module owns the invalidation keys and the primitive per domain fact.
- [ ] The mutations and the live-event path both call it; neither restates a key.
- [ ] A playlist removal takes one primitive on both paths.
- [ ] The cache behaviour is otherwise unchanged, and the invalidation tests move to the map's interface.
- [ ] `pnpm run build`, `pnpm run lint` and the unit suites pass.

**Out of scope:**

- The query hooks' shape or the client.
- The player's refetch (issue 20).
- Adding new events.

## Observed

- `queries.ts`: eleven mutations each write their own `invalidateQueries`/`removeQueries` block.
- `liveEvents.ts`: `invalidateForLiveEvent` restates the keys per event type.
- `queries.ts` uses `removeQueries` for a delete; `liveEvents.ts` uses `resetQueries` for a removal.

## Expected

One map owns the keys and the primitive; both paths consult it and agree.

## Evidence

- `queries.ts:332` `removeQueries` versus `liveEvents.ts:40` `resetQueries`.
- `mutationInvalidation.test.tsx`, `liveEvents.test.ts` and `useEventStream.test.tsx` pin the key literals at the collaborator boundary.
- Architecture review, candidate 4, "One cache-effect map".
