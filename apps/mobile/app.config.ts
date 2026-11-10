import type { ConfigContext, ExpoConfig } from 'expo/config';

import packageJson from './package.json';

/* The addresses a track or a playlist link can open, on the instance's origin. */
const LINK_PATHS = ['/playlists', '/tracks', '/auth'] as const;

const PLAIN_VERSION = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const SUFFIXED_VERSION = /^\d+\.\d+\.\d+[-+]/;

/* Android caps the version code at 2,100,000,000; the fixed decimal layout keeps
 * every bump monotonic, so a component above its bound would collide. */
export function androidVersionCode(version: string): number {
  if (SUFFIXED_VERSION.test(version)) {
    throw new Error(
      `The app version "${version}" has a suffix; a release is a plain major.minor.patch version.`
    );
  }

  const match = PLAIN_VERSION.exec(version);

  if (match === null) {
    throw new Error(
      `The app version "${version}" is not a plain major.minor.patch version.`
    );
  }

  const [, majorText = '0', minorText = '0', patchText = '0'] = match;
  const major = { name: 'major', value: Number(majorText), max: 2099 };
  const minor = { name: 'minor', value: Number(minorText), max: 999 };
  const patch = { name: 'patch', value: Number(patchText), max: 999 };

  for (const part of [major, minor, patch]) {
    if (part.value > part.max) {
      throw new Error(
        `The app version "${version}" has a ${part.name} above ${part.max}.`
      );
    }
  }

  return major.value * 1_000_000 + minor.value * 1_000 + patch.value;
}

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
  const version = packageJson.version;

  if (config.name === undefined || config.slug === undefined) {
    throw new Error('The static Expo config must name the app and its slug.');
  }

  return {
    ...config,
    name: config.name,
    slug: config.slug,
    version,
    plugins: [
      ...(config.plugins ?? []),
      'expo-asset',
      './plugins/withReleaseSigning.cjs'
    ],
    android: {
      ...config.android,
      versionCode: androidVersionCode(version),
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
