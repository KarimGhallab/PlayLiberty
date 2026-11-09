import { describe, expect, it } from '@jest/globals';

import { androidVersionCode } from '../../app.config';

describe('the Android version code', () => {
  it('derives a code from a plain version', () => {
    expect(androidVersionCode('0.1.0')).toBe(1_000);
    expect(androidVersionCode('2.3.4')).toBe(2_003_004);
  });

  it('rises with each semver component', () => {
    expect(androidVersionCode('1.2.4')).toBeGreaterThan(
      androidVersionCode('1.2.3')
    );
    expect(androidVersionCode('1.3.0')).toBeGreaterThan(
      androidVersionCode('1.2.999')
    );
    expect(androidVersionCode('2.0.0')).toBeGreaterThan(
      androidVersionCode('1.999.999')
    );
  });

  it('accepts the largest code Android allows', () => {
    expect(androidVersionCode('2099.999.999')).toBe(2_099_999_999);
  });

  it('rejects a component that would overflow into another version', () => {
    expect(() => androidVersionCode('2100.0.0')).toThrow(/major/);
    expect(() => androidVersionCode('1.1000.0')).toThrow(/minor/);
    expect(() => androidVersionCode('1.0.1000')).toThrow(/patch/);
  });

  it('rejects a version with a suffix', () => {
    expect(() => androidVersionCode('1.2.3-beta.1')).toThrow(/suffix/);
    expect(() => androidVersionCode('1.2.3+build.7')).toThrow(/suffix/);
  });

  it('rejects a version that is not plain major.minor.patch', () => {
    expect(() => androidVersionCode('1.2')).toThrow(/plain/);
    expect(() => androidVersionCode('01.2.3')).toThrow(/plain/);
  });
});
