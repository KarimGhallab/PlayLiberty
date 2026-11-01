import type { ConfigContext, ExpoConfig } from 'expo/config';

/* The addresses a track or a playlist link can open, on the instance's origin. */
const LINK_PATHS = ['/playlists', '/tracks', '/auth'] as const;

/* Only an HTTPS origin can be a verified App Link; a plain-LAN dev origin keeps
 * the custom scheme instead. */
function httpsHost(origin: string): string | null {
  try {
    const url = new URL(origin);

    return url.protocol === 'https:' ? url.hostname : null;
  } catch {
    return null;
  }
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const configured = process.env.EXPO_PUBLIC_API_BASE_URL;
  const fallback =
    typeof config.extra?.['apiBaseUrl'] === 'string'
      ? config.extra['apiBaseUrl']
      : '';
  const host = httpsHost(configured ?? fallback);

  return {
    ...config,
    android: {
      ...config.android,
      intentFilters:
        host === null
          ? []
          : [
              {
                action: 'VIEW',
                autoVerify: true,
                data: LINK_PATHS.map(pathPrefix => ({
                  scheme: 'https',
                  host,
                  pathPrefix
                })),
                category: ['BROWSABLE', 'DEFAULT']
              }
            ]
    },
    ios: {
      ...config.ios,
      associatedDomains: host === null ? [] : [`applinks:${host}`]
    }
  };
};
