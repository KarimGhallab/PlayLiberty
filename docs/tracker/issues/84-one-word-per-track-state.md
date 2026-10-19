# 84: One word per track state

**State:** `resolved`
**Category:** `bug`

## Outcome

The stored state is **stockée** in French and **stored** in English wherever it appears. The chip and row already said `trackState.stored`; the incomplete badge now says `n'est pas stockée` / `ne sont pas stockées`, and both empty promises say `piste stockée` / `stored track`. The download operation keeps its own words (`téléchargement`, `download`) because the glossary separates the operation from the state.

`docs/GLOSSARY.md` records the user-facing term under Track states: `stored` in English and `stockée` in French, used by the chip, the badge, the empty promise and the row. Both catalogs moved together.

Verification: `pnpm run build` and `pnpm run lint` pass; `pnpm test:unit` passes (web 524 tests across 52 files, plus the server and package suites).
