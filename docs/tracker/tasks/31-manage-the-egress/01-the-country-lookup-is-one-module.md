# 01: The country lookup is one module

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** None. Can start immediately.

## Outcome

`packages/ui-foundation/src/country/country.ts` now owns `countryOf`, `flagOf` and `countryNameOf`, exported from the
package. The web Egress page imports them from `@playliberty/ui-foundation`, and the old `countryFlag` folder and its
test are gone.

`countryNameOf` takes the language as a string tag rather than the i18n `Language` type, so the shared package stays
free of an i18n dependency; the web's `Language` value is assignable unchanged. The shared test covers the country
segment, the flag and the localized region name in English and French.

## Verification

- `pnpm --filter @playliberty/ui-foundation test`: 21 passed across 4 files.
- `pnpm --filter @playliberty/web test`: 622 passed across 58 files, including the Egress page's France and
  Switzerland assertions.
- `pnpm run build` and `pnpm run lint:check` pass.
