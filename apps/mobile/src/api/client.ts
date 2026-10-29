import { tokenStore } from '../auth/tokenStore';
import { apiBaseUrl } from './apiBaseUrl';
import { ApiClient } from './apiClient/ApiClient';

/** The one client every read and command goes through. */
export const apiClient = new ApiClient({
  baseUrl: apiBaseUrl(),
  readToken: () => tokenStore.read()
});
