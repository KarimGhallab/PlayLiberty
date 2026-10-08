# 41: Constants and config defaults

**State:** `resolved`
**Category:** `enhancement`

**Blocked by:** None. Can start immediately.

## Agent Brief

**Category:** enhancement
**Summary:** Tests restate tuned constants and config defaults as literals, so a default change with no behavioral effect still breaks the suite.

**Current behavior:**
`loadConfig.test.ts` asserts nine config defaults one by one. `playlistRoutes.test.ts` restates the default page window. `ytdlpArgs.test.ts`, `easing.test.ts`, `emitTokens.test.ts` and `createTranslator.test.ts` assert literal values that another assertion or the token file already owns.

**Desired behavior:**
The literal restatements in the Cut table are removed. Boundary and protocol contracts stay: the yt-dlp extractor and format selectors, the SponsorBlock categories, the duration probe, the sleeve range, the concurrency cap, the media path layout, the cache headers, the language round-trip, the SSE keepalive, and the translator's pluralization.

**Acceptance criteria:**

- [x] The Cut assertions are removed.
- [x] The kept boundary and protocol contracts stay.
- [x] The server and package suites pass.
- [x] `pnpm run build` and `pnpm run lint` pass.

**Out of scope:**

- The web and e2e suites; those are issues 40 and 45.
- Multi-layer redundancy; that is issue 44.

## Manifest

### Cut

| File:line                          | Test                                                                   | Asserted                                                                                                                                             | Drop      |
| ---------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| `loadConfig.test.ts:12-20`         | applies defaults for optional values                                   | port 8080, host `0.0.0.0`, logLevel `info`, concurrency 2, limitRate `5M`, admin `[]`, publicOrigin null, integrationApiKey null, edgeAssertion null | test      |
| `ytdlpArgs.test.ts:93`             | selects the m4a audio stream and ends with the URL after the separator | args contain `'5M'`                                                                                                                                  | assertion |
| `easing.test.ts:10`                | is the token curve, in the order Easing.bezier takes it                | `toEqual([0.4, 0, 0.2, 1])`                                                                                                                          | assertion |
| `emitTokens.test.ts:75`            | resolves through the export map for a browser and a bundler            | `exports['.']` literal                                                                                                                               | assertion |
| `emitTokens.test.ts:79`            | same                                                                   | `exports['./tokens.css']` is `./dist/tokens.css`                                                                                                     | assertion |
| `createTranslator.test.ts:63`      | pins the library strings, the level the catalog inherits               | `app.name` is `PlayLiberty`                                                                                                                          | assertion |
| `createTranslator.test.ts:64-66`   | same                                                                   | `library.add`, `library.loading`, `library.empty.heading` copy                                                                                       | assertion |
| `playlistRoutes.test.ts:230-231`   | returns a page whose items parse against the contract                  | `page.limit` 50, `page.offset` 0                                                                                                                     | assertion |
| `playlistRoutes.test.ts:1008-1009` | answers a playlist with no associations as an empty page               | `page.limit` 50, `page.offset` 0                                                                                                                     | assertion |

### Keep (reviewed, no change)

- `ytdlpArgs.test.ts:40`, `:79` (extractor selector `youtube,youtube:tab`), `:91` (format `bestaudio[ext=m4a]/bestaudio`), `:92` (`--limit-rate`), `:107` (SponsorBlock `music_offtopic,sponsor,selfpromo`), `:159-161` (duration probe). These are the external tool's command contract and the no-transcode rule.
- `loadConfig.test.ts:32`, `:33`, `:45-46`, `:50`, `:60`, `:69`, `:78`. Parsing, normalization, and the production edge-assertion rule.
- `sleeve.test.ts:21-22`, `:39` (range and distribution), `downloadWorker.test.ts:508` (concurrency cap), `mediaPaths.test.ts:7`, `:21` (storage layout), `trackRoutes.test.ts:864`, `:880` (cache headers), `languageStorage.test.ts:70-71` (serialization), `errors.test.ts:44` (fixed reason), `eventRoutes.test.ts:215` (SSE keepalive), `createTranslator.test.ts:67-68` (pluralization).

### Borderline (your call)

| File:line                          | Test                                            | Asserted                                                       | Recommendation                                                      |
| ---------------------------------- | ----------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------- |
| `loadConfig.test.ts:34`            | parses overrides and the admin list             | `pruneCron` is `0 5 * * 1`                                     | cut: a pass-through of the override, no transform                   |
| `playlistRoutes.test.ts:1074-1075` | pages with the existing query                   | `lastPage.limit`/`offset` echo the request `?limit=2&offset=4` | cut: pass-through; the window and total assertions own the behavior |
| `morph.test.ts:34`                 | the generated theme carries the token durations | `generated.duration` is `var(--motion-base)`                   | keep: a cross-artifact contract on a generated file                 |

## Observed

- The Cut table above, catalogued from the server and package suites on 2026-10-08.

## Expected

The literal restatements are gone; the boundary and protocol contracts stay.

## Outcome

Done. The constant and default restatements are gone.

- Removed the `loadConfig.test.ts` "applies defaults for optional values" test (nine defaults) and the `pruneCron` pass-through assertion. The parsing, normalization and production edge-assertion tests in that file stayed.
- Removed the literal restatements in `ytdlpArgs.test.ts:93`, `easing.test.ts:10`, `emitTokens.test.ts` (the exports map, with the self-referencing resolve checks kept), `createTranslator.test.ts:63-66` (branding and library prose copy, with pluralization kept), and the default page window in `playlistRoutes.test.ts:230-231`, `:1008-1009` and the echoed window at `:1074-1075`.
- Kept the yt-dlp command contract, the sleeve range, the concurrency cap, the media path layout, the cache headers, the language round-trip, the SSE keepalive, the edge-assertion rules, and the translator pluralization.

Verification: the full unit suite passes (server 343, web 396, youtube 31, i18n 39, tokens 3, ui-foundation 6). `pnpm run build` and `pnpm run lint` are clean.

## Evidence

- Test pruning review 2026-10-08 (issue 41 manifest, explore pass over `apps/server/src` and `packages/*/src`).
