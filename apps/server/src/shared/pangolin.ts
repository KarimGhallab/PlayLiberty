/* The token issuer's contract, owned by shared so the context can name it
 * without reaching into the feature that implements it. */

export interface MintedResourceAccessToken {
  readonly id: string;
  readonly secret: string;
}

export interface MintResourceAccessTokenInput {
  readonly pangolinUserId: string;
  readonly validForSeconds: number;
  readonly title: string;
}

export interface IPangolinClient {
  mintResourceAccessToken(
    input: MintResourceAccessTokenInput
  ): Promise<MintedResourceAccessToken>;
}
