# 05: The pinned gallery journey

**Blocked by:** [`02`](02-the-pinned-section-and-the-menu-item.md).
**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

## Outcome

Implemented and verified. One journey in [`library.spec.ts`](../../../../e2e/tests/library.spec.ts) proves the
three facts that are true only of the assembled product: the pin is written by the server and read again after a
reload, a pinned playlist leaves the list below rather than being drawn twice, and an account that can only read
a playlist still pins it.

The dev proxy fixes one browser identity, so the browser is the **reader** of the second playlist and the other
account is arranged over the API: the journey creates the partner with the edge headers, has them paste a link
and grant the browser account a read share, and only then drives the browser. The share names an account by its
id, which is the row the identity hook created rather than the edge's `dev-user`, so it is read back through the
same headers the proxy injects.

The press is paired with the response it starts rather than with its optimistic move: the reload that follows
would otherwise be able to outrun the write and read a gallery the server has not changed yet.

The journey asserts, in order: nothing is pinned, so the gallery is the one list; the account's own playlist
leaves the list below for the section when it is pinned from its menu, and it is drawn once; the pin is still
there after a reload; a reader's menu holds the pin alone and pins the shared playlist from it, and the section
now holds the two in name order rather than by which was pinned last; and unpinning both withdraws the section
and leaves the list holding both in name order.

Verification: `pnpm test:e2e` passes with the journey, and `pnpm run test:e2e:typecheck` passes. The journey
fails if the pin is not written by the server, if a pinned playlist is drawn in both groups, or if the read-only
playlist cannot be pinned. Not committed.
