# 06: The lint rule against a hardcoded string

**What to build:** the lint rule that rejects a hardcoded user-facing string in JSX and the known label props,
with an allowlist for non-copy strings, so new copy cannot bypass the catalog. A translated string passes and a
hardcoded one fails.

**Blocked by:** [`01`](01-the-package-the-provider-and-the-language-switch.md).

**Status:** resolved

**Labels:** `enhancement`, `ready-for-agent`

- [x] A hardcoded user-facing string in JSX, or in a known label prop, fails lint.
- [x] A string that comes from the catalog passes, and the allowlist covers the non-copy strings that must stay.
- [x] `pnpm run build`, `pnpm run lint` and the unit suites pass.

## Outcome

Done. A custom ESLint rule rejects hardcoded copy in the web client.

- `eslint-rules/no-hardcoded-string.js` is the rule. It flags a letter-bearing string in JSX text, in a known
  label prop (`aria-label`, `aria-valuetext`, `alt`, `placeholder`, `title`, `label`, `description`, `message`,
  `detail`, `actionLabel`), or in a JSX expression child, including inside a conditional. A `t(...)` call and any
  other call are trusted whole, so `cond ? t('a') : t('b')` passes while `cond ? 'Pause' : 'Play'` fails.
- The allowlist keeps the non-copy strings: a string with no letter, an HTML entity, an example URL and the few
  symbols the interface draws (`--:--`, `×`, `·`, `%`) all pass.
- `eslint.config.js` registers the rule on `apps/web/src/**/*.tsx` and turns it off for `**/*.test.tsx`, whose
  strings are the assertion rather than copy.

An incidental fix: the config change invalidated the ESLint cache and surfaced a latent `no-empty-pattern` in
`e2e/support/test.ts`. The empty pattern is required there, because Playwright reads the first parameter's
destructuring to resolve a fixture's dependencies, so it now carries an `eslint-disable-next-line
no-empty-pattern` with the reason.

Verification: `pnpm run build`, `pnpm run lint` and the unit suites (i18n 39, ui-foundation 6, server 275, web 366) pass. The rule was checked by hand: a temporary `<p>Back to home</p>` in a web file fails lint and is
removed. Not committed.
