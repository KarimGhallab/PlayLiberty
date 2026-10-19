# 84: One word per track state

**State:** `needs-triage`
**Category:** `bug`

**Blocked by:** None. Can start immediately.

## Agent Brief

**Category:** bug
**Summary:** The stored state is named three ways: `Stockee` on the filter chip, "pistes ne sont pas enregistrees" in the incomplete badge's tip, and "telechargee" in the empty gallery's promise.

**Current behavior:**
`packages/i18n` carries `trackState.stored: 'Stockee'`, `library.notDownloaded: '{count} pistes ne sont pas enregistrees'` and `library.empty.promise: "Chaque piste telechargee vous appartient..."`. A user learning the vocabulary from the gallery meets a different word for the same fact on the detail.

**Desired behavior:**
One word for the stored state, used by the chip, the badge, the promise and the row's state word. The word is the user's ("enregistree", "telechargee" or "stockee"), chosen once in `docs/GLOSSARY.md` and applied.

**Key interfaces:**

- The i18n catalogs are the single source; both languages move together.
- The glossary records the decision.

**Acceptance criteria:**

- [ ] The chip, the badge, the promise and the row use one word for the stored state.
- [ ] The English catalog matches.
- [ ] The glossary names the term.
- [ ] `pnpm run build`, `pnpm run lint` and the unit suites pass.

**Out of scope:**

- The other state words, which are already distinct.

## Observed

- `fr.ts:66,253` (`Aucune piste stockee`, `Stockee`), `fr.ts:30-32` (`ne sont pas enregistrees`), `fr.ts:36-39` (`telechargee`).

## Expected

- One fact, one word, everywhere.

## Evidence

- `packages/i18n/src/fr.ts`, `packages/i18n/src/en.ts`, `docs/GLOSSARY.md`.
- Impeccable critique of `apps/web`, 2026-10-19, minor observations.
