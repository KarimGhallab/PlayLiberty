import { describe, expect, it } from 'vitest';

import { loadConfig } from './loadConfig.js';

describe('loadConfig', () => {
  it('parses overrides and the admin list', () => {
    const config = loadConfig({
      MEDIA_ROOT: '/media',
      DATABASE_PATH: '/db.sqlite',
      ADMIN_PANGOLIN_USER_IDS: 'alpha, beta',
      DOWNLOAD_CONCURRENCY: '3',
      PRUNE_CRON: '0 5 * * 1'
    });

    expect(config.adminPangolinUserIds).toEqual(['alpha', 'beta']);
    expect(config.download.concurrency).toBe(3);
  });

  it('treats empty optional values as unset', () => {
    const config = loadConfig({
      MEDIA_ROOT: '/media',
      DATABASE_PATH: '/db.sqlite',
      PUBLIC_ORIGIN: '',
      PANGOLIN_API_URL: ''
    });

    expect(config.publicOrigin).toBeNull();
    expect(config.pangolin.apiUrl).toBeNull();
  });

  it('fails when a required variable is missing', () => {
    expect(() => loadConfig({})).toThrow(/Invalid environment configuration/);
  });

  it('requires the edge assertion in production', () => {
    expect(() =>
      loadConfig({
        NODE_ENV: 'production',
        MEDIA_ROOT: '/media',
        DATABASE_PATH: '/db.sqlite'
      })
    ).toThrow(/EDGE_ASSERTION/);

    const config = loadConfig({
      NODE_ENV: 'production',
      EDGE_ASSERTION: 'the-edge-secret',
      MEDIA_ROOT: '/media',
      DATABASE_PATH: '/db.sqlite'
    });

    expect(config.edgeAssertion).toBe('the-edge-secret');
  });

  it('leaves the edge assertion unset outside production', () => {
    const config = loadConfig({
      MEDIA_ROOT: '/media',
      DATABASE_PATH: '/db.sqlite'
    });

    expect(config.edgeAssertion).toBeNull();
  });
});
