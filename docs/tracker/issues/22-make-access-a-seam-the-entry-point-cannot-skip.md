# 22: Make access a seam the entry point cannot skip

**State:** `ready-for-agent`
**Category:** `enhancement`

**Blocked by:** None. Can start immediately.

## Agent Brief

**Category:** enhancement
**Summary:** The playlist and track access rules are centralized, but each of the eleven service entry points hand-writes the guard, so a new entry point can silently omit it, and the two modules encode the outcome two ways.

**Current behavior:**
The playlist service's seven entry points and the track service's four each call the access module and write their own guard, turning the result into a 404 or a 403. Nothing structural forces a new entry point to check. The two access modules use different conventions: playlist access returns `null` for no access (rendered as 404), track access returns a boolean (rendered as 403).

**Desired behavior:**
The guard folds into the entry seam, so an entry point cannot be written without it, and one outcome convention replaces the two. The observable access behaviour (who sees what, and which status a refusal carries) is unchanged unless the two conventions are deliberately reconciled.

**Key interfaces:**

- The entry seam wraps the access check and the handler, so the check is not optional.
- One outcome convention for a refusal.
- The rules themselves stay in the access modules.

**Acceptance criteria:**

- [ ] An entry point cannot be written without the access check.
- [ ] One outcome convention replaces the two, or the two are documented as deliberate and enforced.
- [ ] The observable access behaviour is unchanged.
- [ ] A test proves a new entry point inherits the guard.
- [ ] `pnpm run build`, `pnpm run lint` and the unit suites pass.

**Out of scope:**

- The rules' logic (who may read, write, manage).
- The live-event audience, which shares the access module.
- The database access pattern.

## Observed

- Eleven service entry points each call the access module and write a guard.
- `playlistAccess` returns `null`/404; `trackAccess` returns a boolean/403.
- Nothing structural forces the check.

## Expected

The guard is part of the entry seam, so a new entry point cannot omit it.

## Evidence

- The access call sites across the playlist and track services.
- Architecture review, candidate 7, "Make access a seam the entry point cannot skip".
