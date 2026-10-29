import * as SecureStore from 'expo-secure-store';

import type { LanguageStore } from '@playliberty/i18n';

/* The choice is a few bytes and not a secret; it shares the secure store with
 * the token so the app has one storage owner. The binding writes synchronously,
 * so the write is fired and forgotten. */

export const secureLanguageStore: LanguageStore = {
  getItem: key => SecureStore.getItem(key),
  setItem: (key, value) => {
    SecureStore.setItem(key, value);
  }
};
