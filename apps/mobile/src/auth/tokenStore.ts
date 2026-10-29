import * as SecureStore from 'expo-secure-store';

import type { AccessToken } from '../api/apiClient/ApiClient';

const TOKEN_ID_KEY = 'playliberty.access-token-id';
const TOKEN_SECRET_KEY = 'playliberty.access-token-secret';

/* The one credential the app owns. Both halves are written and cleared
 * together, so a half-token can never be sent. */

export class TokenStore {
  async read(): Promise<AccessToken | null> {
    const [id, secret] = await Promise.all([
      SecureStore.getItemAsync(TOKEN_ID_KEY),
      SecureStore.getItemAsync(TOKEN_SECRET_KEY)
    ]);

    if (id === null || secret === null) {
      return null;
    }

    return { id, secret };
  }

  async write(token: AccessToken): Promise<void> {
    await Promise.all([
      SecureStore.setItemAsync(TOKEN_ID_KEY, token.id),
      SecureStore.setItemAsync(TOKEN_SECRET_KEY, token.secret)
    ]);
  }

  async clear(): Promise<void> {
    await Promise.all([
      SecureStore.deleteItemAsync(TOKEN_ID_KEY),
      SecureStore.deleteItemAsync(TOKEN_SECRET_KEY)
    ]);
  }
}

export const tokenStore = new TokenStore();
