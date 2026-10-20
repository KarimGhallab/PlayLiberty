import type { UserRole } from '@playliberty/contracts';

/* An account as the instance holds it; it lives here, not in the pipeline,
 * which only reads the edge's identity and hands it over. */
export interface AuthAccount {
  id: string;
  pangolinUserId: string;
  displayName: string;
  email: string | null;
  avatarUrl: string | null;
  role: UserRole;
}

/* What the edge forwards, not an account: there may be no row yet, and the name
 * is whatever the provider sent, including null. */
export interface ForwardedIdentity {
  pangolinUserId: string;
  name: string | null;
  email: string | null;
}
