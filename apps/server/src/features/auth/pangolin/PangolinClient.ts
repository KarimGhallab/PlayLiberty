import { z } from 'zod';

import type {
  IPangolinClient,
  MintResourceAccessTokenInput,
  MintedResourceAccessToken
} from '../../../shared/pangolin.js';

import type { PangolinConfig } from '../../../platform/config/types.js';

/* The calls the server makes to Pangolin: mint a per-user access token for the
 * resource the app talks to, and delete it when a family ends. The key never
 * leaves the process. */

export class PangolinError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PangolinError';
  }
}

const TOKEN_RESPONSE_SCHEMA = z.object({
  success: z.boolean(),
  data: z
    .object({
      accessTokenId: z.string().min(1),
      accessToken: z.string().min(1)
    })
    .nullable(),
  message: z.string().optional()
});

const DELETE_RESPONSE_SCHEMA = z.object({
  success: z.boolean(),
  message: z.string().optional()
});

const REQUEST_TIMEOUT_MS = 10_000;

export class PangolinClient implements IPangolinClient {
  constructor(
    private readonly _config: PangolinConfig,
    private readonly _fetch: typeof fetch = fetch
  ) {}

  async mintResourceAccessToken(
    input: MintResourceAccessTokenInput
  ): Promise<MintedResourceAccessToken> {
    const url = `${this._config.apiUrl.replace(/\/+$/, '')}/public-resource/${this._config.resourceId}/access-token`;

    const response = await this._fetch(url, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${this._config.apiKey}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        validForSeconds: input.validForSeconds,
        title: input.title,
        userId: input.pangolinUserId
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    });

    const body: unknown = await response.json().catch(() => null);
    const parsed = TOKEN_RESPONSE_SCHEMA.safeParse(body);

    if (!response.ok || !parsed.success || !parsed.data.success) {
      const message = parsed.success
        ? parsed.data.message
        : `Pangolin answered ${response.status}`;

      throw new PangolinError(message ?? 'Pangolin refused the token request');
    }

    const token = parsed.data.data;

    if (token === null) {
      throw new PangolinError('Pangolin answered without a token');
    }

    return { id: token.accessTokenId, secret: token.accessToken };
  }

  async deleteResourceAccessToken(tokenId: string): Promise<void> {
    const url = `${this._config.apiUrl.replace(/\/+$/, '')}/access-token/${encodeURIComponent(tokenId)}`;
    const response = await this._fetch(url, {
      method: 'DELETE',
      headers: { authorization: `Bearer ${this._config.apiKey}` },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    });
    const body: unknown = await response.json().catch(() => null);
    const parsed = DELETE_RESPONSE_SCHEMA.safeParse(body);

    if (!response.ok || (parsed.success && !parsed.data.success)) {
      const message = parsed.success
        ? parsed.data.message
        : `Pangolin answered ${response.status}`;

      throw new PangolinError(message ?? 'Pangolin refused the token deletion');
    }
  }
}
