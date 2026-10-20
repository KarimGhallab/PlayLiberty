import type { ReactNode } from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';

import { catalogs } from './catalogs.js';
import { createTranslator } from './createTranslator/createTranslator.js';
import type { Translator } from './createTranslator/createTranslator.js';
import type { Messages } from './en.js';
import {
  readLanguage,
  writeLanguage
} from './languageStorage/languageStorage.js';
import { resolveLanguage } from './resolveLanguage/resolveLanguage.js';
import type { Language } from './types.js';

/* The React binding. The page's `lang` attribute follows the language, so a
 * screen reader and the browser's typography agree. */

export interface I18nValue {
  readonly language: Language;
  readonly setLanguage: (language: Language) => void;
  readonly t: Translator<Messages>;
}

const I18nContext = createContext<I18nValue | null>(null);

interface I18nProviderProps {
  readonly children: ReactNode;
  /** Where the choice is remembered. Defaults to the browser's local storage. */
  readonly storage?: Storage;
  /** The browser's preferred locales, in order. Defaults to `navigator`. */
  readonly preferred?: readonly string[];
  /** A language to start in, overriding resolution. For tests. */
  readonly initialLanguage?: Language;
}

function browserLanguages(): readonly string[] {
  return navigator.languages.length > 0
    ? navigator.languages
    : [navigator.language];
}

export default function I18nProvider({
  children,
  storage,
  preferred,
  initialLanguage
}: I18nProviderProps) {
  const store = storage ?? window.localStorage;
  const [language, setLanguageState] = useState<Language>(
    () =>
      initialLanguage ??
      resolveLanguage(readLanguage(store), preferred ?? browserLanguages())
  );

  const setLanguage = useCallback(
    (next: Language): void => {
      setLanguageState(next);
      writeLanguage(store, next);
    },
    [store]
  );

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo<I18nValue>(
    () => ({
      language,
      setLanguage,
      t: createTranslator(catalogs[language], language)
    }),
    [language, setLanguage]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);

  if (value === null) {
    throw new Error('useI18n must be used inside an I18nProvider.');
  }

  return value;
}
