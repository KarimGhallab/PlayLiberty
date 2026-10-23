# 03: Prove the crop journey end to end

**What to build:** The full cover journey now includes crop. An owner uploads an asymmetric image through the dialog, drags and zooms, saves, and the detail and gallery show the new square; a reload keeps it. A second upload saves untouched, proving the centered default. The existing read-collaborator and 390px passes keep working with the crop stage present.

**Blocked by:** 02.
**Status:** open
**Labels:** `enhancement`, `ready-for-agent`

- [ ] The owner journey chooses an asymmetric image, drags and zooms to a non-centered framing, saves, and the cover appears in the detail and the gallery.
- [ ] The upload request carries the four fractions the stage produced; after a reload, the stored cover is square and still rendered.
- [ ] A second upload saves without touching the stage and the stored cover is square; the centered region itself is owned by the server test.
- [ ] The read collaborator still sees the cover and has no Cover item.
- [ ] The 390px journey still opens the dialog, shows the crop stage and saves without adjustment.
- [ ] The journey does not assert CSS classes, presentation `data-*` or pixel output already owned by the server tests.

**Verification:** `pnpm test:e2e` and `pnpm test:e2e:typecheck` pass.
