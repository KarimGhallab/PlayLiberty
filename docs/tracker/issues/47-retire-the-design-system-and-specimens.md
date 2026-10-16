# 47: Retire the design system and the specimens

**State:** `resolved`
**Category:** `enhancement`
**Blocked by:** None. Can start immediately.

## Outcome

Done. The design documentation layer is gone; the shipped values stay.

- `docs/design-system/` (one record per subject), `docs/design/` (the hand-written HTML specimens, `specimen.css`, the `tokens.css` snapshot, the fonts and the morph scripts) and `docs/DESIGN.md` (the index) are deleted. The two directories and the index had drifted from the product and cost more to maintain than they returned.
- The `design:check`, `design:morph`, `design:morph:json` and `design:morph:splice` scripts are removed from `package.json`.
- `packages/tokens` and `packages/ui-foundation` remain the shipped source of the design values, and the emitted `tokens.css` and the morph table are unchanged.
- `packages/tokens/src/morph/morph.test.ts` is deleted: its only claim was that the packaged table matched the deleted generator's JSON, so it had nothing left to compare against.
- The live docs (`AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/PRODUCT.md`), the code comments that pointed at a specimen, and the tracker tickets that linked a retired record are updated.

The observable behaviour is unchanged: the web client loads the same emitted stylesheet and both clients draw the same morph.

Verification: `pnpm run build` and `pnpm run lint` clean; the unit suites pass; no live doc, code comment or tracker ticket links `docs/design/`, `docs/design-system/` or `docs/DESIGN.md`.
