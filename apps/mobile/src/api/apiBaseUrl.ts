import Constants from 'expo-constants';

const FALLBACK = 'http://localhost:3000';

/** The instance origin. A phone reaches it over the LAN or the public origin. */
export function apiBaseUrl(): string {
  const configured = process.env.EXPO_PUBLIC_API_BASE_URL;

  if (configured !== undefined && configured.length > 0) {
    return configured;
  }

  const extra = Constants.expoConfig?.extra?.['apiBaseUrl'];

  return typeof extra === 'string' ? extra : FALLBACK;
}
