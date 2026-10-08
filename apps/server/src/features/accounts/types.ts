import type { UserRole } from '@playliberty/contracts';

/*
 * An account as the instance holds it. It lives in the accounts feature rather than
 * in the request pipeline, because the pipeline does not own the account: it reads
 * the identity the edge forwarded and hands it here, and everything that later
 * says "this account" is talking about this row.
 *
 * There is no `I` prefix because this is a plain data shape, not a contract
 * something implements.
 */
export interface AuthAccount {
  id: string;
  pangolinUserId: string;
  displayName: string;
  email: string | null;
  avatarUrl: string | null;
  role: UserRole;
}

/*
 * What the edge forwards, which is not the same thing as an account: there may be
 * no account row yet, and the display name is whatever the identity provider
 * happened to send, including null. Converting one into the other is the accounts
 * feature's job, not the hook's.
 */
export interface ForwardedIdentity {
  pangolinUserId: string;
  name: string | null;
  email: string | null;
}
