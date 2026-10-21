#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { accessSync, existsSync, constants as fsConstants } from 'node:fs';
import { homedir, userInfo } from 'node:os';
import path from 'node:path';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
);

const STORAGE_ROOT = '/srv/playliberty';
const MEDIA_ROOT = path.join(STORAGE_ROOT, 'media');
const DATA_ROOT = path.join(STORAGE_ROOT, 'data');

const EDGE = {
  name: 'playliberty_edge_assertion',
  key: 'EDGE_ASSERTION'
};
const PUBLIC_ORIGIN = {
  name: 'playliberty_public_origin',
  key: 'PUBLIC_ORIGIN'
};
const ADMIN = {
  name: 'pangolin_admin_user',
  key: 'ADMIN_PANGOLIN_USER_IDS'
};

const USAGE = `Usage: pnpm deploy:build-for-production [options]

Build the production images, create /srv/playliberty, and ensure the Podman
secrets. This command never installs, removes or starts a unit.

Options:
  --public-origin <url>       Public browser origin (https://host)
  --admin-ids <ids>           Comma-separated Pangolin Remote-User values
  --replace-public-origin     Replace an existing public-origin secret
  --replace-admin             Replace an existing admin secret
  --dry-run                   Prompt, validate and print the plan without changes
  -h, --help                  Show this help

Environment:
  PLAYLIBERTY_PUBLIC_ORIGIN   Same as --public-origin
  PLAYLIBERTY_ADMIN_IDS       Same as --admin-ids

The edge assertion is generated when missing and is never accepted on the
command line.`;

let values;

try {
  ({ values } = parseArgs({
    options: {
      'public-origin': { type: 'string' },
      'admin-ids': { type: 'string' },
      'replace-public-origin': { type: 'boolean', default: false },
      'replace-admin': { type: 'boolean', default: false },
      'dry-run': { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h', default: false }
    }
  }));
} catch (error) {
  console.error(
    `Error: ${error instanceof Error ? error.message : String(error)}\n\n${USAGE}`
  );
  process.exit(1);
}

const dryRun = values['dry-run'];
const publicOriginInput =
  values['public-origin'] ?? process.env.PLAYLIBERTY_PUBLIC_ORIGIN ?? null;
const adminInput =
  values['admin-ids'] ?? process.env.PLAYLIBERTY_ADMIN_IDS ?? null;

let readline;

function isInteractive() {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY);
}

async function ask(question) {
  if (!isInteractive()) {
    throw new Error(
      `${question.trim()} needs an interactive terminal, a flag or an environment variable.`
    );
  }

  readline ??= createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return (await readline.question(question)).trim();
}

async function confirm(question) {
  const answer = (await ask(`${question} [y/N] `)).toLowerCase();
  return answer === 'y' || answer === 'yes';
}

function shellQuote(value) {
  if (/^[A-Za-z0-9_./:@%+=,-]+$/.test(value)) {
    return value;
  }

  return `'${value.replaceAll("'", "'\\''")}'`;
}

function printCommand(command, args) {
  console.log(`  ${[command, ...args].map(shellQuote).join(' ')}`);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    ...options
  });

  if (result.error) {
    throw new Error(`${command}: ${result.error.message}`);
  }

  if (result.status !== 0) {
    const detail = (result.stderr ?? '').trim();
    throw new Error(
      `${command} ${args.join(' ')} failed${detail === '' ? '' : `: ${detail}`}`
    );
  }

  return result;
}

function runOrPrint(command, args, options = {}) {
  printCommand(command, args);

  if (dryRun) {
    return { status: 0, stdout: '', stderr: '' };
  }

  return run(command, args, options);
}

function podmanSecretExists(name) {
  const result = spawnSync('podman', ['secret', 'exists', name], {
    cwd: repoRoot,
    stdio: 'ignore'
  });

  if (result.error) {
    throw new Error(`podman: ${result.error.message}`);
  }

  return result.status === 0;
}

function inspectSecret(spec) {
  if (!podmanSecretExists(spec.name)) {
    return { state: 'missing' };
  }

  const result = spawnSync(
    'podman',
    ['secret', 'inspect', '--showsecret', '--format', '{{json .}}', spec.name],
    { cwd: repoRoot, encoding: 'utf8' }
  );

  if (result.error) {
    throw new Error(`podman: ${result.error.message}`);
  }

  if (result.status !== 0) {
    return {
      state: 'malformed',
      reason: (result.stderr ?? '').trim() || 'secret inspect failed'
    };
  }

  try {
    const outer = JSON.parse(result.stdout);
    const secret = JSON.parse(outer.SecretData);
    const encoded = secret?.data?.[spec.key];

    if (secret?.apiVersion !== 'v1' || secret?.kind !== 'Secret') {
      throw new Error('not a v1 Kubernetes Secret document');
    }

    if (typeof encoded !== 'string' || encoded.length === 0) {
      throw new Error(`missing data.${spec.key}`);
    }

    const value = Buffer.from(encoded, 'base64').toString('utf8');

    if (value.length === 0) {
      throw new Error(`data.${spec.key} is empty`);
    }

    return { state: 'valid', value };
  } catch (error) {
    return {
      state: 'malformed',
      reason: error instanceof Error ? error.message : String(error)
    };
  }
}

function secretDocument(spec, value) {
  return JSON.stringify({
    apiVersion: 'v1',
    kind: 'Secret',
    metadata: { name: spec.name },
    data: { [spec.key]: Buffer.from(value, 'utf8').toString('base64') }
  });
}

function createSecret(spec, value) {
  runOrPrint('podman', ['secret', 'create', '--replace', spec.name, '-'], {
    input: secretDocument(spec, value)
  });

  if (!dryRun) {
    const result = inspectSecret(spec);

    if (result.state !== 'valid') {
      throw new Error(
        `${spec.name} was created but is not valid: ${result.reason ?? result.state}`
      );
    }
  }
}

function removeSecret(spec) {
  if (!podmanSecretExists(spec.name)) {
    return;
  }

  runOrPrint('podman', ['secret', 'rm', spec.name]);
}

function normalizePublicOrigin(input) {
  let url;

  try {
    url = new URL(input);
  } catch {
    throw new Error('The public origin must be a valid URL.');
  }

  if (url.protocol !== 'https:') {
    throw new Error('The public origin must use https.');
  }

  if (
    url.username !== '' ||
    url.password !== '' ||
    url.pathname !== '/' ||
    url.search !== '' ||
    url.hash !== ''
  ) {
    throw new Error(
      'The public origin must be a bare origin such as https://host.'
    );
  }

  if (input !== url.origin) {
    throw new Error(
      'The public origin must have no trailing slash, path, query or fragment.'
    );
  }

  return url.origin;
}

function normalizeAdminIds(input) {
  if (input === null || input.trim() === '') {
    return null;
  }

  const entries = input.split(',').map(entry => entry.trim());

  if (entries.some(entry => entry.length === 0)) {
    throw new Error('Admin IDs must not contain empty entries.');
  }

  return entries.join(',');
}

async function promptPublicOrigin() {
  while (true) {
    const input = await ask('Public origin (https://host): ');

    try {
      return normalizePublicOrigin(input);
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
    }
  }
}

async function ensureEdge() {
  console.log('\nEdge assertion');

  const current = inspectSecret(EDGE);

  if (current.state === 'valid') {
    console.log('  Existing secret is valid; keeping it.');
    return;
  }

  if (current.state === 'malformed') {
    console.log(`  Existing secret is malformed: ${current.reason}`);

    if (!(await confirm('  Recreate it?'))) {
      throw new Error(`${EDGE.name} is malformed and was not replaced.`);
    }
  } else {
    console.log('  Missing; generating a new value.');
  }

  createSecret(EDGE, randomBytes(32).toString('hex'));
  console.log(
    dryRun
      ? '  Would prepare the secret; its value is not printed.'
      : '  Secret prepared; its value is not printed.'
  );
}

async function ensurePublicOrigin() {
  console.log('\nPublic origin');

  const current = inspectSecret(PUBLIC_ORIGIN);
  let value = publicOriginInput;

  if (current.state === 'valid') {
    if (!values['replace-public-origin']) {
      console.log('  Existing secret is valid; keeping it.');
      return;
    }

    value ??= await promptPublicOrigin();
    createSecret(PUBLIC_ORIGIN, normalizePublicOrigin(value));
    console.log(
      dryRun
        ? '  Would replace the existing secret.'
        : '  Existing secret replaced.'
    );
    return;
  }

  if (current.state === 'malformed') {
    console.log(`  Existing secret is malformed: ${current.reason}`);

    if (!(await confirm('  Replace it?'))) {
      throw new Error(
        `${PUBLIC_ORIGIN.name} is malformed and was not replaced.`
      );
    }
  } else {
    console.log('  Missing; a value is required.');
  }

  value ??= await promptPublicOrigin();
  createSecret(PUBLIC_ORIGIN, normalizePublicOrigin(value));
  console.log(dryRun ? '  Would prepare the secret.' : '  Secret prepared.');
}

async function ensureAdmin() {
  console.log('\nAdmin user');

  const current = inspectSecret(ADMIN);
  const wasMalformed = current.state === 'malformed';
  let value = adminInput;

  if (current.state === 'valid') {
    if (!values['replace-admin']) {
      console.log('  Existing secret is valid; keeping it.');
      return;
    }

    if (value === null) {
      value = await ask(
        'Admin Remote-User values, comma-separated (empty removes): '
      );
    }

    const normalized = normalizeAdminIds(value);

    if (normalized === null) {
      removeSecret(ADMIN);
      console.log(dryRun ? '  Would remove the secret.' : '  Secret removed.');
      return;
    }

    createSecret(ADMIN, normalized);
    console.log(
      dryRun
        ? '  Would replace the existing secret.'
        : '  Existing secret replaced.'
    );
    return;
  }

  if (current.state === 'malformed') {
    console.log(`  Existing secret is malformed: ${current.reason}`);

    if (!(await confirm('  Recreate it?'))) {
      if (await confirm('  Remove it instead?')) {
        removeSecret(ADMIN);
        console.log(
          dryRun ? '  Would remove the secret.' : '  Secret removed.'
        );
        return;
      }

      throw new Error(`${ADMIN.name} is malformed and was not changed.`);
    }
  }

  if (value === null) {
    value = isInteractive()
      ? await ask('Admin Remote-User values, comma-separated (empty skips): ')
      : '';
  }

  const normalized = normalizeAdminIds(value);

  if (normalized === null) {
    if (wasMalformed) {
      removeSecret(ADMIN);
      console.log(dryRun ? '  Would remove the secret.' : '  Secret removed.');
    } else {
      console.log('  Optional secret absent; no admin is configured.');
    }

    return;
  }

  createSecret(ADMIN, normalized);
  console.log(dryRun ? '  Would prepare the secret.' : '  Secret prepared.');
}

function checkRepositoryInputs() {
  const required = [
    'apps/server/Containerfile',
    'apps/web/Containerfile',
    'deploy/playliberty-web.yaml',
    'deploy/playliberty-web.kube'
  ];

  for (const relative of required) {
    if (!existsSync(path.join(repoRoot, relative))) {
      throw new Error(`Missing required repository file: ${relative}`);
    }
  }
}

function buildImages() {
  console.log('Building production images');

  const images = [
    {
      file: 'apps/server/Containerfile',
      tag: 'localhost/playliberty-server:latest'
    },
    {
      file: 'apps/web/Containerfile',
      tag: 'localhost/playliberty-web:latest'
    }
  ];

  for (const image of images) {
    runOrPrint('podman', ['build', '-f', image.file, '-t', image.tag, '.'], {
      stdio: 'inherit'
    });
  }

  if (dryRun) {
    return;
  }

  for (const image of images) {
    const result = spawnSync('podman', ['image', 'exists', image.tag], {
      cwd: repoRoot,
      stdio: 'ignore'
    });

    if (result.error) {
      throw new Error(`podman: ${result.error.message}`);
    }

    if (result.status !== 0) {
      throw new Error(`Image was not built: ${image.tag}`);
    }
  }
}

function ensureStorage() {
  console.log('\nHost storage');

  const user = userInfo().username;
  const group = run('id', ['-gn']).stdout.trim();
  const directories = [STORAGE_ROOT, MEDIA_ROOT, DATA_ROOT];

  runOrPrint(
    'sudo',
    ['install', '-d', '-m', '0700', '-o', user, '-g', group, ...directories],
    { stdio: 'inherit' }
  );

  if (dryRun) {
    console.log('  Would create the directories at 0700.');
    return;
  }

  for (const directory of [MEDIA_ROOT, DATA_ROOT]) {
    try {
      accessSync(directory, fsConstants.W_OK);
    } catch {
      throw new Error(
        `${directory} is not writable. Run: sudo chown -R ${user}:${group} ${MEDIA_ROOT} ${DATA_ROOT}`
      );
    }
  }

  console.log('  Directories exist and are writable.');
}

function printNextSteps() {
  const unitDirectory = path.join(
    homedir(),
    '.config',
    'containers',
    'systemd'
  );
  const manifest = path.join(repoRoot, 'deploy', 'playliberty-web.yaml');
  const unit = path.join(repoRoot, 'deploy', 'playliberty-web.kube');

  console.log('\nNext steps (not executed by this script):');
  console.log(`  mkdir -p ${shellQuote(unitDirectory)}`);
  console.log(
    `  install -m 0644 ${shellQuote(manifest)} ${shellQuote(unitDirectory)}/`
  );
  console.log(
    `  install -m 0644 ${shellQuote(unit)} ${shellQuote(unitDirectory)}/`
  );
  console.log('  systemctl --user daemon-reload');
  console.log('  systemctl --user stop playliberty-web.service');
  console.log('  podman pod rm -f playliberty-web');
  console.log('  systemctl --user start playliberty-web.service');
  console.log(
    '  podman exec playliberty-web-web wget -qO- http://127.0.0.1:8080/healthz'
  );
}

async function main() {
  if (values.help) {
    console.log(USAGE);
    return;
  }

  if (dryRun) {
    console.log('Dry run: no build, directory or secret mutation will run.');
  }

  checkRepositoryInputs();
  buildImages();
  ensureStorage();
  await ensureEdge();
  await ensurePublicOrigin();
  await ensureAdmin();
  printNextSteps();

  if (dryRun) {
    console.log('\nDry run complete.');
  }
}

try {
  await main();
} catch (error) {
  console.error(
    `Error: ${error instanceof Error ? error.message : String(error)}`
  );
  process.exitCode = 1;
} finally {
  readline?.close();
}
