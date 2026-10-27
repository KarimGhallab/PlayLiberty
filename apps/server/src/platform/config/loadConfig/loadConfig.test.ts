import { describe, expect, it } from 'vitest';

import { loadConfig } from './loadConfig.js';

const required = {
  MEDIA_ROOT: '/media',
  DATABASE_PATH: '/db.sqlite'
};

describe('loadConfig', () => {
  it('parses overrides and the admin list', () => {
    const config = loadConfig({
      NODE_ENV: 'test',
      ...required,
      ADMIN_PANGOLIN_USER_IDS: 'alpha, beta',
      DOWNLOAD_CONCURRENCY: '3',
      PRUNE_CRON: '0 5 * * 1'
    });

    expect(config.adminPangolinUserIds).toEqual(['alpha', 'beta']);
    expect(config.download.concurrency).toBe(3);
  });

  it('reads the egress rotation overrides as numbers', () => {
    const overridden = loadConfig({
      NODE_ENV: 'test',
      ...required,
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
      NODE_ENV: 'test',
      ...required,
      PUBLIC_ORIGIN: ''
    });

    expect(config.publicOrigin).toBeNull();
  });

  it('fails when a required variable is missing', () => {
    expect(() => loadConfig({})).toThrow(/Invalid environment configuration/);
  });

  it('requires the edge assertion in every non-test runtime', () => {
    for (const nodeEnv of ['production', 'development', 'staging']) {
      expect(() => loadConfig({ NODE_ENV: nodeEnv, ...required })).toThrow(
        /EDGE_ASSERTION/
      );
    }

    const config = loadConfig({
      NODE_ENV: 'production',
      ...required,
      EDGE_ASSERTION: 'the-edge-secret'
    });

    expect(config.edgeAssertion).toBe('the-edge-secret');
  });

  it('classifies an unrecognised environment as production', () => {
    const config = loadConfig({
      NODE_ENV: 'staging',
      ...required,
      EDGE_ASSERTION: 'the-edge-secret'
    });

    expect(config.runtime).toBe('production');
  });

  it('exempts only the test runtime from the edge assertion', () => {
    const config = loadConfig({ NODE_ENV: 'test', ...required });

    expect(config.runtime).toBe('test');
    expect(config.edgeAssertion).toBeNull();
  });

  it('binds loopback by default', () => {
    const config = loadConfig({ NODE_ENV: 'test', ...required });

    expect(config.host).toBe('127.0.0.1');
  });

  it('accepts another loopback address', () => {
    const config = loadConfig({
      NODE_ENV: 'test',
      ...required,
      HOST: '::1'
    });

    expect(config.host).toBe('::1');
  });

  it('refuses a non-loopback bind without the opt-in', () => {
    expect(() =>
      loadConfig({
        NODE_ENV: 'development',
        ...required,
        EDGE_ASSERTION: 'the-edge-secret',
        HOST: '0.0.0.0'
      })
    ).toThrow(/ALLOW_NON_LOOPBACK_BIND/);
  });

  it('allows a non-loopback bind with the opt-in', () => {
    const config = loadConfig({
      NODE_ENV: 'development',
      ...required,
      EDGE_ASSERTION: 'the-edge-secret',
      HOST: '0.0.0.0',
      ALLOW_NON_LOOPBACK_BIND: 'true'
    });

    expect(config.host).toBe('0.0.0.0');
  });
});
