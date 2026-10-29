import * as Crypto from 'expo-crypto';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import type {
  BrowserResult,
  ProvisioningDeps
} from './provisioning/provisioning';

/* The platform half of the flow: the browser sheet, the app's own callback, and
 * the digest the challenge needs. The decisions live in `provisioning.ts`. */

/** The HTTPS App Link first when one is configured, then the app's own scheme. */
export function provisioningRedirectUris(): readonly string[] {
  const https = process.env.EXPO_PUBLIC_MOBILE_REDIRECT_URI;
  const scheme = Linking.createURL('provision');

  return https !== undefined && https.length > 0 ? [https, scheme] : [scheme];
}

function toBrowserResult(
  result: WebBrowser.WebBrowserAuthSessionResult
): BrowserResult {
  if (result.type === 'success') {
    return { type: 'success', url: result.url };
  }

  if (result.type === 'cancel') {
    return { type: 'cancel' };
  }

  if (result.type === 'locked') {
    return { type: 'locked' };
  }

  return { type: 'dismiss' };
}

function toBase64Url(value: string): string {
  return value.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export const expoProvisioningDeps: ProvisioningDeps = {
  openBrowser: async (url, redirectUri) =>
    toBrowserResult(await WebBrowser.openAuthSessionAsync(url, redirectUri)),
  fetch: (input, init) => fetch(input, init),
  randomBytes: length => Crypto.getRandomBytes(length),
  digest: async input =>
    toBase64Url(
      await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        input,
        { encoding: Crypto.CryptoEncoding.BASE64 }
      )
    )
};
