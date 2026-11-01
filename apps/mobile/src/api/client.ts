import {
  accessTokenOf,
  sessionRecordStore
} from '../auth/sessionRecord/sessionRecord';
import { apiBaseUrl } from './apiBaseUrl';
import { ApiClient } from './apiClient/ApiClient';

/** The one client every read and command goes through. */
export const apiClient = new ApiClient({
  baseUrl: apiBaseUrl(),
  readToken: async () => {
    const record = await sessionRecordStore.read();

    return record === null ? null : accessTokenOf(record);
  }
});
