import { en } from './en.js';
import type { Messages } from './en.js';
import { fr } from './fr.js';
import { Language } from './types.js';

/*
 * The catalogs by language. The record is exhaustive over `Language`, so adding
 * a language without a catalog is a compile error.
 */
export const catalogs: Readonly<Record<Language, Messages>> = {
  [Language.English]: en,
  [Language.French]: fr
};
