# 08: Fetch a fileless track whole from the row

**What to build:** A track with no stored file offers a control that forces it to be fetched without trimming,
beside its retry, so a listener whose SponsorBlock lookup failed, or who knows the source should stay whole, has
a way out. Pressing it calls the new route and leaves the track pending. The control is offered only when the
caller can write a playlist holding the track and the track has no stored file. The row also shows the track's
recorded policy, so a track that is full length when a trimmed one was expected is not a black box. The track
row draws one control in two shapes today, so this ticket settles how the bypass and the retry coexist and
records it.

**Blocked by:** [`02`](02-store-a-track-with-non-music-parts-skipped.md), [`05`](05-fetch-one-fileless-track-whole.md).

**Status:** resolved

**Labels:** `enhancement`, `ready-for-agent`

- [x] A failed fileless track offers the bypass; a stored track and a pending one do not.
- [x] Pressing it calls the route and the row returns to pending.
- [x] A caller who cannot write the playlist sees no control.
- [x] The track's recorded policy is visible, so a full-length track reads as deliberate.
- [x] The row's control rule is honoured and the design system record is updated.
- [x] axe and the web unit suite pass.

**Verification:** the web unit suite, `pnpm run build`, `pnpm run lint` and `pnpm run design:check`.

## Outcome

Implemented and verified. The row's lane is one control, the **actions menu**, and the row's rule is what its
menu holds: a failed fileless track the caller can write gets **Retry**, **Fetch whole** and **Remove from
playlist**; every other curatable row gets **Remove from playlist** alone; a row the caller cannot curate keeps
its reserved, inert lane. The lane stays **28px**, so the title column keeps its 516px.

**The lane layout was settled with a throwaway prototype, and the owner chose variant C.** Four variants were
drawn on the playlist detail behind `?variant=` (two buttons side by side; retry plus an overflow; one menu;
retry plus a sub-line action) and the owner picked the single menu. The trade is explicit and recorded: the
retry is no longer one press, and the title column pays nothing for the bypass. The prototype was removed after
the choice; the winning rule is the code and the design record.

**Two deviations from the ticket, both the owner's calls.**

- **The bypass is failed-only, not "no stored file".** Ticket 05's route also accepts `pending`, and the
  original wording would have offered it there. The owner narrowed it to a failed track, which is the case the
  feature exists for: a SponsorBlock lookup that failed. A pending track keeps its plain actions menu.
- **The retry moved into the menu.** The ticket wanted the bypass "beside its retry"; the chosen variant keeps
  one control and puts the retry in it, so the two are beside each other in the menu rather than in the lane.

**The policy word.** A track whose recorded `skipNonMusic` is false carries **`Full length`** on its state line,
muted and never a tone, because it is a fact about the track and not a fault. The default, trimmed, says
nothing, so a track fetched whole reads as deliberate rather than as a trim that silently failed.

The tests: five on the row's menu (retry, fetch whole and remove together on a failed track; no fetch whole on a
stored track; no fetch whole when the caller cannot act; only the remove on a failed track the caller cannot
retry; the menu disabled while an action is in flight), two on the policy word, and one on the detail that a
failed track's menu POSTs `fetch-whole` and draws the policy word. The E2E retry journey now goes through the
menu, since the direct retry is gone.

The design record carries it: [`playlist-detail.md`](../../../design-system/screens/playlist-detail.md) gains a
"The row's actions" section, and both specimens' failed rows draw the actions menu rather than a retry, with the
CSS rule and the usage line updated. `track-row.html`'s now-unused retry glyph was removed with them.

Verification: `pnpm run test` (server 248, web 279, youtube 22, e2e 23), `pnpm run build`, `pnpm run lint` and
`pnpm run design:check` pass. No em dashes. Not committed.
