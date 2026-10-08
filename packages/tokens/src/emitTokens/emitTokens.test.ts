import { access, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import type { Token } from '../types.js';
import { TokenKind } from '../types.js';
import { tokenGroups } from '../values.js';

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..'
);
const distPath = path.join(packageRoot, 'dist');
const stylesheetPath = path.join(distPath, 'tokens.css');

function parseDeclarations(stylesheet: string): Map<string, string> {
  const declarations = new Map<string, string>();
  const pattern = /^\s*--([a-z0-9-]+):\s*(.+);$/gm;
  let match = pattern.exec(stylesheet);

  while (match !== null) {
    declarations.set(match[1], match[2]);
    match = pattern.exec(stylesheet);
  }

  return declarations;
}

/** The rendering the emitter is expected to produce, written out separately. */
function renderValue(token: Token): string {
  switch (token.kind) {
    case TokenKind.Color:
      return token.value;
    case TokenKind.Length:
      return `${token.value}px`;
    case TokenKind.Duration:
      return `${token.value}ms`;
    case TokenKind.Number:
      return `${token.value}`;
    case TokenKind.Family:
      return `'${token.value}'`;
    case TokenKind.Curve:
      return `cubic-bezier(${token.value.join(', ')})`;
  }
}

describe('the emitted stylesheet', () => {
  it('declares every designed value and nothing else', async () => {
    const stylesheet = await readFile(stylesheetPath, 'utf8');
    const declared = parseDeclarations(stylesheet);
    const expected = new Map<string, string>();

    for (const [, tokens] of tokenGroups) {
      for (const [name, token] of Object.entries(tokens)) {
        expected.set(name, renderValue(token));
      }
    }

    expect([...declared.keys()].sort()).toEqual([...expected.keys()].sort());

    for (const [name, value] of expected) {
      expect(declared.get(name)).toBe(value);
    }
  });

  it('resolves through the export map for a browser and a bundler', async () => {
    await expect(access(stylesheetPath)).resolves.toBeUndefined();
    await expect(
      access(path.join(distPath, 'index.js'))
    ).resolves.toBeUndefined();

    // Self-referencing by name walks the export map the way a consumer does,
    // without importing a `.css` file that Node cannot load.
    const require = createRequire(import.meta.url);

    expect(require.resolve('@playliberty/tokens')).toBe(
      path.join(distPath, 'index.js')
    );
    expect(require.resolve('@playliberty/tokens/tokens.css')).toBe(
      stylesheetPath
    );
  });
});
