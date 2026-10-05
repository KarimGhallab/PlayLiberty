import { describe, expect, it } from 'vitest';

import { loadConfig } from './loadConfig.js';

describe('loadConfig', () => {
  it('applies defaults for optional values', () => {
    const config = loadConfig({
      MEDIA_ROOT: '/media',
      DATABASE_PATH: '/data/db.sqlite'
    });

    expect(config.port).toBe(8080);
    expect(config.logLevel).toBe('info');
    expect(config.download.concurrency).toBe(2);
    expect(config.download.limitRate).toBe('5M');
    expect(config.adminPangolinUserIds).toEqual([]);
    expect(config.publicOrigin).toBeNull();
    expect(config.pangolin.integrationApiKey).toBeNull();
  });

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
    expect(config.pruneCron).toBe('0 5 * * 1');
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
});
