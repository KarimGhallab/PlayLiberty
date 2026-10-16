# 05: The pinned gallery journey

**Blocked by:** [`02`](02-the-pinned-section-and-the-menu-item.md), [`03`](03-the-pin-on-the-cover.md).
**Status:** open
**Labels:** `enhancement`, `ready-for-agent`

## Objective

One browser journey proves the three facts that are true only once the product is assembled: the pin is written
by the server and read again after a reload, a pinned playlist is lifted out of the list below rather than drawn
twice, and an account that can only read a playlist can still pin it.

## Context

Read [`13-pin-a-playlist`](../../specs/13-pin-a-playlist.md). The library already has a journey and the suite
already seeds an instance per journey, so this ticket writes one more journey rather than a harness. The
two-account isolation case stays in the route tests of `01`, where a second account can be seeded without a
second browser.

## Scope

- **Seed one playlist the account owns and one shared with it at the read level**, so both the permission case
  and the two-group case are in one journey.
- **Pin from the cover control**, which is the affordance this journey is about, and assert the section appears
  above the list, names itself, and holds the pinned item while the list below does not.
- **Reload and assert the pin is still there**, because the placement is the account's and not the tab's.
- **Pin the second playlist and assert the order**: the most recently pinned first.
- **Unpin both and assert the section withdraws entirely**, with the list below holding both in the order it
  had.
- **Assert that the read-only playlist pins**, which is the case the menu cannot carry.

## Out of scope

The two-account isolation case, which lives in the route tests. The card arrangement's own pin. The specimen.

## Verification

- `pnpm test:e2e` passes with the new journey, and `pnpm run test:e2e:typecheck` passes.
- The journey fails if the pin is not written by the server, if a pinned playlist is drawn in both groups, or if
  the read-only playlist cannot be pinned.
