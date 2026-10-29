/* The short-lived code store's contract, owned by shared so the context can
 * name it without reaching into the provisioning feature. */

export interface ProvisioningCode {
  readonly pangolinUserId: string;
  readonly redirectUri: string;
  readonly codeChallenge: string;
  readonly expiresAt: number;
}

export interface MintCodeInput {
  readonly pangolinUserId: string;
  readonly redirectUri: string;
  readonly codeChallenge: string;
}

export interface IProvisioningCodes {
  mintCode(input: MintCodeInput): string;
  consumeCode(code: string): ProvisioningCode | null;
  isExpired(entry: ProvisioningCode): boolean;
  allowExchange(key: string): boolean;
  verifyPkce(verifier: string, challenge: string): boolean;
}
