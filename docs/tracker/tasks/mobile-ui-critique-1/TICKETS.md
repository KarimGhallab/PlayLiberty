# mobile-ui-critique-1

Tickets for [issue 108](../../issues/108-a-design-critique-scores-the-mobile-app-26-40.md), the first design critique of
the mobile client. One file per ticket, numbered by severity, each declaring its blocking edges. Every ticket is an
issue ticket: it repairs or sharpens what already ships. The critique's 26/40 report is archived at
`.impeccable/critique/2026-11-03T14-25-35Z__apps-mobile.md`.

| Ticket                                                                                                          | Severity | Status   | Blocked by | Blocks |
| --------------------------------------------------------------------------------------------------------------- | -------- | -------- | ---------- | ------ |
| [`01-the-typeface-never-loads`](01-the-typeface-never-loads.md)                                                 | P1       | resolved | none       | none   |
| [`02-the-detail-state-line-has-no-sync-control`](02-the-detail-state-line-has-no-sync-control.md)               | P1       | resolved | none       | none   |
| [`03-the-retention-promise-has-no-word-and-no-surface`](03-the-retention-promise-has-no-word-and-no-surface.md) | P1       | resolved | none       | 04     |
| [`04-a-gallery-card-is-one-focus-stop`](04-a-gallery-card-is-one-focus-stop.md)                                 | P1       | resolved | 03         | none   |
| [`05-sign-out-acts-on-one-press`](05-sign-out-acts-on-one-press.md)                                             | P2       | resolved | none       | none   |
| [`06-a-row-swipe-starts-playback`](06-a-row-swipe-starts-playback.md)                                           | P2       | resolved | none       | none   |
| [`07-four-motion-paths-ignore-reduced-motion`](07-four-motion-paths-ignore-reduced-motion.md)                   | P2       | resolved | none       | none   |
| [`08-the-pinned-row-mounts-every-cover-eagerly`](08-the-pinned-row-mounts-every-cover-eagerly.md)               | P2       | resolved | none       | none   |
| [`09-the-detail-header-controls-overlap`](09-the-detail-header-controls-overlap.md)                             | P2       | resolved | none       | none   |
| [`10-the-gallery-chip-is-clipped-at-rest`](10-the-gallery-chip-is-clipped-at-rest.md)                           | P2       | resolved | none       | none   |
| [`11-two-surfaces-have-no-loading-state`](11-two-surfaces-have-no-loading-state.md)                             | P2       | resolved | none       | none   |
| [`12-the-record-and-the-first-screen-disagree`](12-the-record-and-the-first-screen-disagree.md)                 | P3       | resolved | none       | none   |
| [`13-the-artwork-button-is-44dp`](13-the-artwork-button-is-44dp.md)                                             | P3       | resolved | none       | none   |
| [`14-zero-count-chips-differ-between-the-rails`](14-zero-count-chips-differ-between-the-rails.md)               | P3       | resolved | none       | none   |
| [`15-the-egress-facts-arrive-unlabelled`](15-the-egress-facts-arrive-unlabelled.md)                             | P3       | resolved | none       | none   |
| [`16-the-brand-name-translates`](16-the-brand-name-translates.md)                                               | P3       | resolved | none       | none   |
| [`17-the-skeleton-reserves-no-filter-rail`](17-the-skeleton-reserves-no-filter-rail.md)                         | P3       | resolved | none       | none   |
| [`18-the-detector-cannot-see-the-mobile-client`](18-the-detector-cannot-see-the-mobile-client.md)               | P3       | resolved | none       | none   |

## Conventions

- One file per ticket, numbered by severity; every ticket without a blocker can start immediately.
- `01`, `03`, `12` and `16` are `ready-for-human` for one reason each: a font file, a product word, a record decision
  and a brand spelling. The agent may not install a package, so the font arrives from the human.
- `04` waits on `03`: collapsing the card to one target must carry the count the card shows, so the name is completed
  first.
- The shell is settled. No ticket here redesigns the pill bar, the dial or the sheets; the direction recorded on
  issue 108 is "keep the shell, deepen the state".
- Resolve a ticket by recording the outcome in the ticket and updating its row here. Do not delete it.
