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

  it('defaults the egress rotation bounds and reads their overrides', () => {
    const defaults = loadConfig({
      MEDIA_ROOT: '/media',
      DATABASE_PATH: '/db.sqlite'
    });

    expect(defaults.egressFailureLimit).toBe(5);
    expect(defaults.egressDrainTimeoutMs).toBe(60000);
    expect(defaults.egressSwitchCooldownMs).toBe(60000);

    const overridden = loadConfig({
      MEDIA_ROOT: '/media',
      DATABASE_PATH: '/db.sqlite',
      EGRESS_FAILURE_LIMIT: '3',
      EGRESS_DRAIN_TIMEOUT_MS: '1000',
      EGRESS_SWITCH_COOLDOWN_MS: '0'
    });

    expect(overridden.egressFailureLimit).toBe(3);
    expect(overridden.egressDrainTimeoutMs).toBe(1000);
    expect(overridden.egressSwitchCooldownMs).toBe(0);
  });

  it('treats empty optional values as unset', () => {
    const config = loadConfig({
      MEDIA_ROOT: '/media',
      DATABASE_PATH: '/db.sqlite',
      PUBLIC_ORIGIN: ''
    });

    expect(config.publicOrigin).toBeNull();
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
