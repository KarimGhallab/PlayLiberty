# 113: The journey order is whatever the filesystem returns

**State:** `resolved`
**Category:** `bug`

**Blocked by:** None.

## Outcome

`flowsUnder` sorts each directory's entries by name in byte order, and the runner now passes the selected flow files to Maestro in that order instead of the folder, so Maestro cannot re-expand a folder in an order the runner does not control. Several targets keep the order they were given in, and a single named file is its own run.

The README no longer claims the flows are independent. It states that the order is defined and lists the leftovers once: `detail-add-batch` leaves the added track in `CI Jazz` and `CI Rest`, `detail-arrange` saves the `newest` sort, `gallery-add` leaves `CI Added`, and `signed-out` ends the session. The flows that put back what they change are named in the same section, and a flow that runs before the one seeding its state fails as a consequence of the order, not as flakiness.

Verification: a stub Maestro recorded its arguments. A folder created as `zeta`, `alpha`, `middle` reached Maestro as `alpha`, `middle`, `zeta`; the real `.maestro` folder reached it as its 16 flows in alphabetical order, `detail-add-batch` first and `signed-out` last; a single named file stayed alone; and two targets kept their given order. `node --check`, `pnpm run lint:check`, `pnpm run build` and `pnpm test:unit` pass. Making the flows independent of those leftovers remains out of scope, as the ticket says.
