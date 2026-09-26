import type { UserRole } from '@playliberty/contracts';

export interface AuthAccount {
  id: string;
  pangolinUserId: string;
  displayName: string;
  email: string | null;
  avatarUrl: string | null;
  role: UserRole;
}

export interface ForwardedIdentity {
  pangolinUserId: string;
  name: string | null;
  email: string | null;
}

declare module 'fastify' {
  interface FastifyRequest {
    account: AuthAccount;
  }
}
