import {
  type MobileToken,
  MobileTokenSchema,
  type Problem,
  ProblemSchema
} from '@playliberty/contracts';

/* The browser flow's decisions, free of the platform: a PKCE challenge and a
 * state go out, a single-use code comes back, and the code is traded for the
 * token pair the app stores. The long-lived token never travels in a URL. */

export enum ProvisioningFailure {
  Cancelled = 'cancelled',
  Dismissed = 'dismissed',
  StateMismatch = 'state_mismatch',
  Refused = 'refused',
  NotStarted = 'not_started'
}

export class ProvisioningError extends Error {
  readonly failure: ProvisioningFailure;
  readonly problem: Problem | null;

  constructor(failure: ProvisioningFailure, problem: Problem | null = null) {
    super(failure);
    this.name = 'ProvisioningError';
    this.failure = failure;
    this.problem = problem;
  }
}

export type BrowserResult =
  | { readonly type: 'success'; readonly url: string }
  | { readonly type: 'cancel' }
  | { readonly type: 'dismiss' }
  | { readonly type: 'locked' };

export interface ProvisioningDeps {
  readonly openBrowser: (
    url: string,
    redirectUri: string
  ) => Promise<BrowserResult>;
  readonly fetch: ProvisioningFetch;
  readonly randomBytes: (length: number) => Uint8Array;
  readonly digest: (input: string) => Promise<string>;
}

export type ProvisioningFetch = (
  input: string,
  init?: RequestInit
) => Promise<Response>;

export interface ProvisioningOptions {
  readonly baseUrl: string;
  readonly redirectUris: readonly string[];
  readonly deps: ProvisioningDeps;
}

interface PendingProvisioning {
  readonly baseUrl: string;
  readonly verifier: string;
  readonly state: string;
  readonly redirectUri: string;
}

/* One flow at a time. The verifier never leaves the app, and the callback route
 * reads it here; a restart during the browser step loses it, which is why the
 * code also expires in a minute. */
let pending: PendingProvisioning | null = null;

export function cancelProvisioning(): void {
  pending = null;
}

/** Opens the browser and leaves the exchange to the callback route. */
export async function beginProvisioning(
  options: ProvisioningOptions
): Promise<void> {
  const verifier = base64Url(options.deps.randomBytes(32));
  const challenge = await options.deps.digest(verifier);
  const state = base64Url(options.deps.randomBytes(16));
  const baseUrl = options.baseUrl.replace(/\/+$/, '');

  for (const redirectUri of options.redirectUris) {
    pending = { baseUrl, verifier, state, redirectUri };

    const provisionUrl = new URL(`${baseUrl}/provision`);
    provisionUrl.searchParams.set('code_challenge', challenge);
    provisionUrl.searchParams.set('code_challenge_method', 'S256');
    provisionUrl.searchParams.set('redirect_uri', redirectUri);
    provisionUrl.searchParams.set('state', state);

    const result = await options.deps.openBrowser(
      provisionUrl.toString(),
      redirectUri
    );

    if (result.type === 'cancel' || result.type === 'locked') {
      pending = null;
      throw new ProvisioningError(ProvisioningFailure.Cancelled);
    }

    if (result.type === 'dismiss') {
      continue;
    }

    return;
  }

  pending = null;
  throw new ProvisioningError(ProvisioningFailure.Dismissed);
}

/** The callback route's half: check the state and trade the code. */
export async function completeProvisioning(
  input: { readonly code: string; readonly state: string },
  deps: ProvisioningDeps
): Promise<MobileToken> {
  const current = pending;

  if (current === null) {
    throw new ProvisioningError(ProvisioningFailure.NotStarted);
  }

  if (!constantTimeEqual(input.state, current.state)) {
    pending = null;
    throw new ProvisioningError(ProvisioningFailure.StateMismatch);
  }

  try {
    const token = await exchange(deps, current.baseUrl, {
      code: input.code,
      verifier: current.verifier,
      redirectUri: current.redirectUri
    });

    pending = null;
    return token;
  } catch (error) {
    pending = null;
    throw error;
  }
}

async function exchange(
  deps: ProvisioningDeps,
  baseUrl: string,
  input: {
    readonly code: string;
    readonly verifier: string;
    readonly redirectUri: string;
  }
): Promise<MobileToken> {
  const response = await deps.fetch(`${baseUrl}/auth/exchange`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-playliberty-client': 'mobile'
    },
    body: JSON.stringify({
      code: input.code,
      code_verifier: input.verifier,
      redirect_uri: input.redirectUri
    })
  });

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const problem = ProblemSchema.safeParse(body);

    throw new ProvisioningError(
      ProvisioningFailure.Refused,
      problem.success ? problem.data : null
    );
  }

  const token = MobileTokenSchema.safeParse(body);

  if (!token.success) {
    throw new ProvisioningError(ProvisioningFailure.Refused);
  }

  return token.data;
}

/** Length first, then every character, so a near match costs the same. */
export function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) {
    return false;
  }

  let difference = 0;

  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return difference === 0;
}

const BASE64_URL_ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

export function base64Url(bytes: Uint8Array): string {
  let encoded = '';

  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index] ?? 0;
    const second = bytes[index + 1];
    const third = bytes[index + 2];

    encoded += BASE64_URL_ALPHABET.charAt(first >> 2);
    encoded += BASE64_URL_ALPHABET.charAt(
      ((first & 0x03) << 4) | ((second ?? 0) >> 4)
    );

    if (second !== undefined) {
      encoded += BASE64_URL_ALPHABET.charAt(
        ((second & 0x0f) << 2) | ((third ?? 0) >> 6)
      );
    }

    if (third !== undefined) {
      encoded += BASE64_URL_ALPHABET.charAt(third & 0x3f);
    }
  }

  return encoded;
}
