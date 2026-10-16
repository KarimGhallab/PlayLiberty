# 06: The lint rule against a hardcoded string

**Status:** resolved

## Outcome

A custom ESLint rule, `eslint-rules/no-hardcoded-string.js`, rejects hardcoded copy in the web client. It flags a letter-bearing string in JSX text, in a known label prop (`aria-label`, `aria-valuetext`, `alt`, `placeholder`, `title`, `label`, `description`, `message`, `detail`, `actionLabel`), or in a JSX expression child, including inside a conditional; a `t(...)` call and any other call are trusted whole, so `cond ? t('a') : t('b')` passes while `cond ? 'Pause' : 'Play'` fails. The allowlist keeps the non-copy strings: a string with no letter, an HTML entity, an example URL and the few symbols the interface draws (`--:--`, `×`, `·`, `%`). `eslint.config.js` registers the rule on `apps/web/src/**/*.tsx` and turns it off for `**/*.test.tsx`, whose strings are the assertion rather than copy.

See [`11-choose-a-language`](../../specs/11-choose-a-language.md).
