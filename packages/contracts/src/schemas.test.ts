import { describe, expect, it } from 'vitest';

import { UserRole } from './enums.js';
import { AccountSchema, TrackSchema, createPageSchema } from './schemas.js';

describe('AccountSchema', () => {
  it('accepts a valid account', () => {
    const parsed = AccountSchema.parse({
      id: 'account-1',
      displayName: 'Ada',
      email: 'ada@example.com',
      avatarUrl: null,
      role: UserRole.Admin
    });

    expect(parsed.role).toBe(UserRole.Admin);
  });

  it('rejects an unknown role', () => {
    expect(() =>
      AccountSchema.parse({
        id: 'account-1',
        displayName: 'Ada',
        email: null,
        avatarUrl: null,
        role: 'root'
      })
    ).toThrow();
  });
});

describe('createPageSchema', () => {
  it('validates an empty page and applies the item schema', () => {
    const schema = createPageSchema(TrackSchema);
    const page = schema.parse({ items: [], total: 0, limit: 50, offset: 0 });

    expect(page.total).toBe(0);
    expect(page.items).toEqual([]);
  });

  it('rejects a negative total', () => {
    const schema = createPageSchema(TrackSchema);

    expect(() =>
      schema.parse({ items: [], total: -1, limit: 50, offset: 0 })
    ).toThrow();
  });
});
