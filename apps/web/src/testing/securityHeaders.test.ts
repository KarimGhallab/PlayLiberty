import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

/*
 * The origin's security headers are deployment config, not app code, but a config
 * that silently loses them is exactly the regression this guards: the headers live
 * in one included snippet, and nginx drops inherited `add_header` directives at any
 * level that defines one, so the shell and the assets have to include it again.
 *
 * The path is taken from the package working directory, because the jsdom
 * environment makes `import.meta.url` an http URL rather than the file's own.
 */
function readDeploy(name: string): string {
  return readFileSync(resolve(process.cwd(), 'deploy', name), 'utf8');
}

describe('the origin security headers', () => {
  const headers = readDeploy('security-headers.conf');
  const origin = readDeploy('nginx.conf.template');

  it('sends a content security policy that locks the origin down', () => {
    expect(headers).toContain('Content-Security-Policy');
    expect(headers).toContain("default-src 'self'");
    expect(headers).toContain("object-src 'none'");
    expect(headers).toContain("base-uri 'self'");
    expect(headers).toContain("frame-ancestors 'none'");
  });

  it('sends nosniff, a referrer policy and HSTS on every response', () => {
    for (const header of [
      'X-Content-Type-Options "nosniff"',
      'Referrer-Policy "no-referrer"',
      'Strict-Transport-Security'
    ]) {
      expect(headers).toContain(header);
    }

    // Every directive carries `always`, so an error response keeps them too.
    const directives = headers
      .split('\n')
      .filter(line => line.startsWith('add_header'));
    expect(directives.length).toBeGreaterThan(0);
    expect(directives.every(line => line.endsWith('always;'))).toBe(true);
  });

  it('includes the headers at the server level and in each caching location', () => {
    const includes =
      origin.match(
        /include \/etc\/nginx\/snippets\/security-headers\.conf;/g
      ) ?? [];

    // The server block, `/assets/`, and `/index.html`: the two locations that add
    // their own `Cache-Control` would otherwise drop the inherited headers.
    expect(includes).toHaveLength(3);
  });
});
