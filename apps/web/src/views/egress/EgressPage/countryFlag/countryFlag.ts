import type { Language } from '@playliberty/i18n';

const COUNTRY_CODE = /^[^-]+-([A-Za-z]{2})(?:-|$)/;
const TWO_LETTERS = /^[A-Za-z]{2}$/;

/*
 * The pool name is `NN-CC-<slug>.conf`, so the country is the second segment.
 * The name is the operator's label; the endpoint IP is not a country signal.
 */
export function countryOf(name: string): string | null {
  const code = COUNTRY_CODE.exec(name)?.[1];

  return code === undefined ? null : code.toUpperCase();
}

/* Two regional indicator code points; no flag assets to keep in sync. */
export function flagOf(country: string): string | null {
  if (!TWO_LETTERS.test(country)) {
    return null;
  }

  return String.fromCodePoint(
    ...[...country.toUpperCase()].map(
      letter => 0x1f1e6 + letter.charCodeAt(0) - 65
    )
  );
}

/* The flag's accessible name and tooltip; the code remains the fallback. */
export function countryNameOf(
  country: string,
  language: Language
): string | null {
  if (!TWO_LETTERS.test(country)) {
    return null;
  }

  try {
    return (
      new Intl.DisplayNames([language], { type: 'region' }).of(
        country.toUpperCase()
      ) ?? null
    );
  } catch {
    return null;
  }
}
