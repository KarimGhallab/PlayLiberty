#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import {
  accessSync,
  existsSync,
  constants as fsConstants,
  mkdtempSync,
  readFileSync,
  rmSync
} from 'node:fs';
import { isIP } from 'node:net';
import { homedir, tmpdir, userInfo } from 'node:os';
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

const EGRESS = {
  root: '/etc/playliberty',
  pool: '/etc/playliberty/proton',
  binDirectory: '/usr/local/lib/playliberty',
  hostBinary: '/usr/local/lib/playliberty/yt-dlp',
  vethHost: 'pl-egress0',
  ytdlpLabel: 'org.playliberty.ytdlp.sha256'
};

const APPARMOR = {
  localDirectory: '/etc/apparmor.d/local',
  wgQuickProfile: '/etc/apparmor.d/wg-quick',
  wgProfile: '/etc/apparmor.d/wg'
};

const UNIT_PATH =
  '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin';

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
const PANGOLIN = {
  name: 'playliberty_pangolin',
  keys: {
    apiUrl: 'PANGOLIN_API_URL',
    resourceId: 'PANGOLIN_RESOURCE_ID',
    integrationKey: 'PANGOLIN_INTEGRATION_API_KEY',
    redirectUris: 'MOBILE_REDIRECT_URIS'
  }
};

const MOBILE_CALLBACK_PATH = '/auth/callback';
const MOBILE_SCHEME_REDIRECT = 'dev.playliberty.app://provision';

const USAGE = `Usage: pnpm deploy:build-for-production [options]

Build the production images, create /srv/playliberty, check the unit's Node,
validate the egress pool, add the AppArmor local rules when the profiles exist,
allow its endpoints through UFW when active, extract the image's yt-dlp, and
ensure the Podman secrets. This command never installs, removes or starts a
unit.

Options:
  --public-origin <url>       Public browser origin (https://host)
  --admin-ids <ids>           Comma-separated Pangolin Remote-User values
  --pangolin-api-url <url>    Integration API base, including /v1
  --pangolin-resource-id <id> Pangolin resource id
  --mobile-redirect-uris <uris>
                              Callbacks the app may use, comma-separated
  --replace-public-origin     Replace an existing public-origin secret
  --replace-admin             Replace an existing admin secret
  --replace-pangolin          Replace an existing Pangolin secret
  --dry-run                   Prompt, validate and print the plan without changes
  -h, --help                  Show this help

Environment:
  PLAYLIBERTY_PUBLIC_ORIGIN   Same as --public-origin
  PLAYLIBERTY_ADMIN_IDS       Same as --admin-ids
  PLAYLIBERTY_PANGOLIN_API_URL
  PLAYLIBERTY_PANGOLIN_RESOURCE_ID
  PLAYLIBERTY_PANGOLIN_INTEGRATION_API_KEY
  PLAYLIBERTY_MOBILE_REDIRECT_URIS

The edge assertion is generated when missing and is never accepted on the
command line. The Pangolin integration key is read from the environment or
prompted; it is never accepted on the command line.`;

let values;

try {
  ({ values } = parseArgs({
    options: {
      'public-origin': { type: 'string' },
      'admin-ids': { type: 'string' },
      'pangolin-api-url': { type: 'string' },
      'pangolin-resource-id': { type: 'string' },
      'mobile-redirect-uris': { type: 'string' },
      'replace-public-origin': { type: 'boolean', default: false },
      'replace-admin': { type: 'boolean', default: false },
      'replace-pangolin': { type: 'boolean', default: false },
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
const pangolinApiUrlInput =
  values['pangolin-api-url'] ??
  process.env.PLAYLIBERTY_PANGOLIN_API_URL ??
  null;
const pangolinResourceIdInput =
  values['pangolin-resource-id'] ??
  process.env.PLAYLIBERTY_PANGOLIN_RESOURCE_ID ??
  null;
const pangolinKeyInput =
  process.env.PLAYLIBERTY_PANGOLIN_INTEGRATION_API_KEY ?? null;
const mobileRedirectUrisInput =
  values['mobile-redirect-uris'] ??
  process.env.PLAYLIBERTY_MOBILE_REDIRECT_URIS ??
  null;

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

function ensureHostNode() {
  console.log('\nHost Node');

  if (dryRun) {
    console.log(
      "  Would check that node is available to root on the unit's PATH."
    );
    return;
  }

  const mise = readFileSync(path.join(repoRoot, 'mise.toml'), 'utf8');
  const pinned = /^node\s*=\s*"([^"]+)"/m.exec(mise)?.[1];

  if (pinned === undefined) {
    throw new Error('mise.toml does not pin node.');
  }

  let resolved;

  try {
    resolved = run('sudo', [
      'env',
      `PATH=${UNIT_PATH}`,
      'sh',
      '-c',
      'command -v node'
    ]).stdout.trim();
  } catch {
    resolved = '';
  }

  if (resolved.length === 0) {
    throw new Error(
      `Node is not available to root on the unit's PATH. Make it visible to root, for example:\n` +
        `  sudo install -D -m 0755 ${shellQuote(process.execPath)} /usr/local/lib/playliberty/node/${pinned}/bin/node\n` +
        `  sudo ln -sfn /usr/local/lib/playliberty/node/${pinned}/bin/node /usr/local/bin/node\n` +
        'Then rerun this command.'
    );
  }

  const actual = run('sudo', [resolved, '--version']).stdout.trim();

  if (actual !== `v${pinned}`) {
    throw new Error(
      `Node ${actual} is visible to root, but mise.toml pins v${pinned}. Make v${pinned} available to root.`
    );
  }

  console.log(`  ${actual} is available to root at ${resolved}.`);
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

    if (secret?.apiVersion !== 'v1' || secret?.kind !== 'Secret') {
      throw new Error('not a v1 Kubernetes Secret document');
    }

    const keys =
      spec.keys === undefined ? [spec.key] : Object.values(spec.keys);
    const values = {};

    for (const key of keys) {
      const encoded = secret?.data?.[key];

      if (typeof encoded !== 'string' || encoded.length === 0) {
        throw new Error(`missing data.${key}`);
      }

      const value = Buffer.from(encoded, 'base64').toString('utf8');

      if (value.length === 0) {
        throw new Error(`data.${key} is empty`);
      }

      values[key] = value;
    }

    return {
      state: 'valid',
      value: spec.keys === undefined ? values[spec.key] : undefined,
      values
    };
  } catch (error) {
    return {
      state: 'malformed',
      reason: error instanceof Error ? error.message : String(error)
    };
  }
}

function secretDocument(spec, values) {
  const entries =
    typeof values === 'string' ? [[spec.key, values]] : Object.entries(values);

  return JSON.stringify({
    apiVersion: 'v1',
    kind: 'Secret',
    metadata: { name: spec.name },
    data: Object.fromEntries(
      entries.map(([key, value]) => [
        key,
        Buffer.from(value, 'utf8').toString('base64')
      ])
    )
  });
}

function createSecret(spec, values) {
  runOrPrint('podman', ['secret', 'create', '--replace', spec.name, '-'], {
    input: secretDocument(spec, values)
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
      return current.value;
    }

    const normalized = normalizePublicOrigin(
      value ?? (await promptPublicOrigin())
    );
    createSecret(PUBLIC_ORIGIN, normalized);
    console.log(
      dryRun
        ? '  Would replace the existing secret.'
        : '  Existing secret replaced.'
    );
    return normalized;
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

  const normalized = normalizePublicOrigin(
    value ?? (await promptPublicOrigin())
  );
  createSecret(PUBLIC_ORIGIN, normalized);
  console.log(dryRun ? '  Would prepare the secret.' : '  Secret prepared.');

  return normalized;
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

function normalizePangolinApiUrl(input) {
  let url;

  try {
    url = new URL(input);
  } catch {
    throw new Error('The Pangolin API URL must be a valid URL.');
  }

  if (url.protocol !== 'https:') {
    throw new Error('The Pangolin API URL must use https.');
  }

  if (
    url.username !== '' ||
    url.password !== '' ||
    url.search !== '' ||
    url.hash !== ''
  ) {
    throw new Error(
      'The Pangolin API URL must be a base URL with no credentials, query or fragment.'
    );
  }

  if (!url.pathname.endsWith('/v1') && !url.pathname.endsWith('/v1/')) {
    throw new Error('The Pangolin API URL must end in /v1.');
  }

  return `${url.origin}${url.pathname.replace(/\/+$/, '')}`;
}

function normalizePangolinResourceId(input) {
  const value = Number(input);

  if (!Number.isInteger(value) || value <= 0) {
    throw new Error('The Pangolin resource id must be a positive integer.');
  }

  return String(value);
}

function normalizePangolinKey(input) {
  const value = input.trim();

  if (value.length === 0) {
    throw new Error('The Pangolin integration key must not be empty.');
  }

  return value;
}

function defaultMobileRedirectUris(publicOrigin) {
  return `${publicOrigin}${MOBILE_CALLBACK_PATH},${MOBILE_SCHEME_REDIRECT}`;
}

function normalizeMobileRedirectUris(input, publicOrigin) {
  const entries = input
    .split(',')
    .map(entry => entry.trim())
    .filter(entry => entry.length > 0);

  if (entries.length === 0) {
    throw new Error('The mobile redirect URIs must not be empty.');
  }

  for (const entry of entries) {
    let parsed;

    try {
      parsed = new URL(entry);
    } catch {
      throw new Error(`The mobile redirect URI ${entry} is not a valid URL.`);
    }

    if (
      parsed.protocol !== 'https:' &&
      parsed.protocol !== 'dev.playliberty.app:'
    ) {
      throw new Error(
        `The mobile redirect URI ${entry} must use https or the app scheme.`
      );
    }
  }

  const https = `${publicOrigin}${MOBILE_CALLBACK_PATH}`;

  if (!entries.includes(https)) {
    throw new Error(`The mobile redirect URIs must include ${https}.`);
  }

  if (!entries.includes(MOBILE_SCHEME_REDIRECT)) {
    throw new Error(
      `The mobile redirect URIs must include ${MOBILE_SCHEME_REDIRECT}.`
    );
  }

  return entries.join(',');
}

function validatePangolinInputs() {
  const supplied = [
    pangolinApiUrlInput,
    pangolinResourceIdInput,
    pangolinKeyInput
  ].filter(entry => entry !== null);

  if (supplied.length > 0 && supplied.length < 3) {
    throw new Error(
      'PANGOLIN_API_URL, PANGOLIN_RESOURCE_ID and PANGOLIN_INTEGRATION_API_KEY must be supplied together.'
    );
  }
}

async function ensurePangolin(publicOrigin) {
  console.log('\nPangolin integration');

  validatePangolinInputs();

  const current = inspectSecret(PANGOLIN);

  if (current.state === 'valid' && !values['replace-pangolin']) {
    console.log('  Existing secret is valid; keeping it.');
    return;
  }

  if (current.state === 'malformed') {
    console.log(`  Existing secret is malformed: ${current.reason}`);

    if (!(await confirm('  Replace it?'))) {
      throw new Error(`${PANGOLIN.name} is malformed and was not replaced.`);
    }
  } else if (current.state === 'missing') {
    console.log(
      '  Missing; the three values and the callback allowlist are required.'
    );
  }

  const apiUrl = normalizePangolinApiUrl(
    pangolinApiUrlInput ?? (await ask('Pangolin API URL (https://host/v1): '))
  );
  const resourceId = normalizePangolinResourceId(
    pangolinResourceIdInput ?? (await ask('Pangolin resource id: '))
  );
  const integrationKey = normalizePangolinKey(
    pangolinKeyInput ?? (await ask('Pangolin integration API key: '))
  );
  const redirectUris = normalizeMobileRedirectUris(
    mobileRedirectUrisInput ?? defaultMobileRedirectUris(publicOrigin),
    publicOrigin
  );

  createSecret(PANGOLIN, {
    [PANGOLIN.keys.apiUrl]: apiUrl,
    [PANGOLIN.keys.resourceId]: resourceId,
    [PANGOLIN.keys.integrationKey]: integrationKey,
    [PANGOLIN.keys.redirectUris]: redirectUris
  });

  console.log(dryRun ? '  Would prepare the secret.' : '  Secret prepared.');
}

/* The Ubuntu wg profiles allow /etc/wireguard only. Add the pool and the
 * stripped temp file to their local includes, then reload them. */
function ensureEgressAppArmor() {
  console.log('\nAppArmor');

  if (dryRun) {
    console.log(
      '  Would add the egress pool and temp-file allowances when the wg-quick and wg profiles are present.'
    );
    return;
  }

  const entries = [
    {
      profile: APPARMOR.wgQuickProfile,
      local: path.join(APPARMOR.localDirectory, 'wg-quick'),
      rules: [
        '/etc/playliberty/ r,',
        '/etc/playliberty/proton/ r,',
        '/etc/playliberty/proton/** r,'
      ]
    },
    {
      profile: APPARMOR.wgProfile,
      local: path.join(APPARMOR.localDirectory, 'wg'),
      rules: [
        '/tmp/playliberty-wg-*/ r,',
        '/tmp/playliberty-wg-*/config.conf r,',
        '/tmp/tmp.* r,'
      ]
    }
  ].filter(entry => existsSync(entry.profile));

  if (entries.length === 0) {
    console.log(
      '  The wg-quick and wg AppArmor profiles are not present; no local rules needed.'
    );
    return;
  }

  runOrPrint('sudo', ['install', '-d', '-m', '0755', APPARMOR.localDirectory]);

  let changed = false;

  for (const entry of entries) {
    const include = `<local/${path.basename(entry.local)}>`;
    const profile = spawnSync('sudo', ['cat', entry.profile], {
      cwd: repoRoot,
      encoding: 'utf8'
    });

    if (profile.error) {
      throw new Error(`sudo: ${profile.error.message}`);
    }

    if (profile.status !== 0) {
      throw new Error(`Could not read ${entry.profile}.`);
    }

    if (!profile.stdout.includes(include)) {
      console.log(
        `  Warning: ${entry.profile} does not include ${include}; add the rules inside the profile.`
      );
    }

    const current = spawnSync('sudo', ['cat', entry.local], {
      cwd: repoRoot,
      encoding: 'utf8'
    });

    if (current.error) {
      throw new Error(`sudo: ${current.error.message}`);
    }

    const content = current.status === 0 ? current.stdout : '';
    const missing = entry.rules.filter(
      rule => !content.split('\n').includes(rule)
    );

    if (missing.length === 0) {
      console.log(`  ${entry.local} already has the egress allowances.`);
      continue;
    }

    const separator = content.length > 0 && !content.endsWith('\n') ? '\n' : '';

    runOrPrint('sudo', ['tee', '-a', entry.local], {
      input: `${separator}${missing.join('\n')}\n`
    });
    changed = true;
    console.log(`  Added ${String(missing.length)} rule(s) to ${entry.local}.`);
  }

  if (!changed) {
    return;
  }

  for (const entry of entries) {
    runOrPrint('sudo', ['apparmor_parser', '-r', entry.profile]);
  }
}

function parseIpv4Endpoint(endpoint) {
  const separator = endpoint.lastIndexOf(':');

  if (separator <= 0) {
    return null;
  }

  const host = endpoint.slice(0, separator);
  const port = endpoint.slice(separator + 1);

  if (isIP(host) !== 4 || !/^\d+$/.test(port)) {
    return null;
  }

  const number = Number(port);

  if (number < 1 || number > 65535) {
    return null;
  }

  return { host, port };
}

/* UFW's routed policy is a second forward filter; the nftables table cannot
 * override its drop. Add each pool endpoint and let UFW skip existing rules. */
function ensureEgressFirewall(pool) {
  console.log('\nEgress firewall');

  const ufw = spawnSync('sudo', ['sh', '-c', 'command -v ufw'], {
    cwd: repoRoot,
    encoding: 'utf8'
  });

  if (ufw.error) {
    throw new Error(`sudo: ${ufw.error.message}`);
  }

  if (ufw.status !== 0) {
    console.log(
      '  UFW is not installed; the nftables table is the only forward filter.'
    );
    return;
  }

  const status = run('sudo', ['ufw', 'status']).stdout;

  if (!/^Status:\s+active\s*$/m.test(status)) {
    console.log('  UFW is inactive; no route rules needed.');
    return;
  }

  const route = run('sudo', ['ip', 'route', 'show', 'default']).stdout;
  const wan = /^\s*default\b[^\n]*\bdev\s+(\S+)/m.exec(route)?.[1];

  if (wan === undefined) {
    throw new Error('The host has no default route.');
  }

  const endpoints = new Map();

  for (const config of pool) {
    if (typeof config.endpoint !== 'string') {
      continue;
    }

    const endpoint = parseIpv4Endpoint(config.endpoint);

    if (endpoint === null) {
      console.log(
        `  Skipping ${config.name}: ${config.endpoint} is not an IPv4 endpoint.`
      );
      continue;
    }

    endpoints.set(`${endpoint.host}:${endpoint.port}`, endpoint);
  }

  if (endpoints.size === 0) {
    console.log('  No IPv4 endpoints; no route rules needed.');
    return;
  }

  for (const { host, port } of endpoints.values()) {
    runOrPrint('sudo', [
      'ufw',
      'route',
      'allow',
      'in',
      'on',
      EGRESS.vethHost,
      'out',
      'on',
      wan,
      'to',
      host,
      'port',
      port,
      'proto',
      'udp'
    ]);
    runOrPrint('sudo', [
      'ufw',
      'route',
      'allow',
      'in',
      'on',
      wan,
      'out',
      'on',
      EGRESS.vethHost,
      'from',
      host,
      'port',
      port,
      'proto',
      'udp'
    ]);
  }

  console.log(`  ${String(endpoints.size)} endpoint(s) allowed through UFW.`);
}

/*
 * The pool is root-owned and never written here. The agent's own parser is the
 * one that reads it, and `wg-quick strip` is the one the switch will run, so a
 * file that passes both is a file the agent can apply.
 */
function ensureEgressHost() {
  console.log('\nEgress host');

  runOrPrint('sudo', [
    'install',
    '-d',
    '-m',
    '0755',
    '-o',
    'root',
    '-g',
    'root',
    '/etc/netns',
    EGRESS.root,
    EGRESS.binDirectory
  ]);
  runOrPrint('sudo', [
    'install',
    '-d',
    '-m',
    '0700',
    '-o',
    'root',
    '-g',
    'root',
    EGRESS.pool
  ]);
  runOrPrint('sudo', ['chown', 'root:root', EGRESS.pool]);
  runOrPrint('sudo', ['chmod', '0700', EGRESS.pool]);

  ensureEgressAppArmor();

  if (dryRun) {
    console.log(
      '  Would validate the pool read-only, keep its files at 0600, and allow the pool endpoints through UFW when active.'
    );
    return;
  }

  let wgQuick;

  try {
    wgQuick = run('sh', ['-c', 'command -v wg-quick']).stdout.trim();
  } catch {
    wgQuick = '';
  }

  if (wgQuick.length === 0) {
    throw new Error(
      'wireguard-tools is required: wg-quick was not found on PATH.'
    );
  }

  const names = run('sudo', [
    'find',
    EGRESS.pool,
    '-maxdepth',
    '1',
    '(',
    '-type',
    'f',
    '-o',
    '-type',
    'l',
    ')',
    '-name',
    '*.conf',
    '-printf',
    '%f\n'
  ])
    .stdout.trim()
    .split('\n')
    .filter(name => name.length > 0)
    .sort();

  if (names.length === 0) {
    console.log('  No configs yet; the agent will report an empty pool.');
    return;
  }

  for (const name of names) {
    if (!/^\d{2}-[A-Za-z0-9][A-Za-z0-9._-]*\.conf$/.test(name)) {
      throw new Error(
        `The egress config ${name} must be named NN-<slug>.conf.`
      );
    }

    const file = path.join(EGRESS.pool, name);
    const ownership = run('sudo', ['stat', '-c', '%u:%a', file]).stdout.trim();

    if (ownership !== '0:600') {
      runOrPrint('sudo', ['chown', 'root:root', file]);
      runOrPrint('sudo', ['chmod', '0600', file]);
    }

    /* Read-only syntax check: strip writes only stdout, and the private key is
     * discarded. The stderr is kept so a malformed file says why. */
    try {
      run('sudo', [wgQuick, 'strip', file], {
        stdio: ['ignore', 'ignore', 'pipe']
      });
    } catch (error) {
      throw new Error(
        `The egress config ${name} is not a valid wg-quick file: ${
          error instanceof Error ? error.message : String(error)
        }`,
        { cause: error }
      );
    }

    try {
      run('sudo', ['grep', '-Eq', '^[[:space:]]*Address[[:space:]]*=', file], {
        stdio: 'ignore'
      });
    } catch {
      throw new Error(`The egress config ${name} has no Address line.`);
    }

    try {
      run('sudo', ['grep', '-Eq', '^[[:space:]]*DNS[[:space:]]*=', file], {
        stdio: 'ignore'
      });
    } catch {
      throw new Error(`The egress config ${name} has no DNS line.`);
    }
  }

  const agentEntry = path.join(
    repoRoot,
    'apps',
    'egress-agent',
    'dist',
    'main.js'
  );

  if (!existsSync(agentEntry)) {
    throw new Error('Build the workspace first: pnpm run build.');
  }

  const temporaryState = path.join(
    tmpdir(),
    `playliberty-pool-check-${String(process.pid)}`
  );

  try {
    const result = run(
      'sudo',
      [
        'env',
        `PROTON_POOL_DIR=${EGRESS.pool}`,
        `EGRESS_STATE_FILE=${temporaryState}`,
        process.execPath,
        agentEntry,
        '--dry-run'
      ],
      { encoding: 'utf8' }
    );
    const status = JSON.parse(result.stdout);
    const broken = status.pool.filter(config => config.endpoint === null);

    if (broken.length > 0) {
      throw new Error(
        `The egress pool has configs without an endpoint: ${broken
          .map(config => config.name)
          .join(', ')}.`
      );
    }

    ensureEgressFirewall(status.pool);
  } finally {
    rmSync(temporaryState, { force: true });
  }

  console.log(
    `  ${String(names.length)} config(s) parse; the pool was not written.`
  );
}

/*
 * The host binary is the image's, verified against the image's committed
 * label. There is no second yt-dlp version to drift from the Containerfile.
 */
function ensureHostYtdlp() {
  console.log('\nHost yt-dlp');

  const image = 'localhost/playliberty-server:latest';

  if (dryRun) {
    printCommand('podman', ['create', image]);
    printCommand('podman', [
      'cp',
      '<container>:/usr/local/bin/yt-dlp',
      '<temporary>/yt-dlp'
    ]);
    printCommand('podman', [
      'inspect',
      '--format',
      `{{ index .Config.Labels "${EGRESS.ytdlpLabel}" }}`,
      image
    ]);
    printCommand('sudo', [
      'install',
      '-m',
      '0755',
      '-o',
      'root',
      '-g',
      'root',
      '<temporary>/yt-dlp',
      EGRESS.hostBinary
    ]);
    console.log('  Would verify the image digest and install the binary.');
    return;
  }

  const expected = run('podman', [
    'inspect',
    '--format',
    `{{ index .Config.Labels "${EGRESS.ytdlpLabel}" }}`,
    image
  ]).stdout.trim();

  if (!/^[0-9a-f]{64}$/.test(expected)) {
    throw new Error(`The server image carries no ${EGRESS.ytdlpLabel} label.`);
  }

  const directory = mkdtempSync(path.join(tmpdir(), 'playliberty-ytdlp-'));
  let container = null;

  try {
    container = run('podman', ['create', image]).stdout.trim();
    const extracted = path.join(directory, 'yt-dlp');
    run('podman', ['cp', `${container}:/usr/local/bin/yt-dlp`, extracted]);

    const actual = createHash('sha256')
      .update(readFileSync(extracted))
      .digest('hex');

    if (actual !== expected) {
      throw new Error(
        `The image's yt-dlp digest ${actual} does not match its committed ${expected}.`
      );
    }

    runOrPrint('sudo', [
      'install',
      '-m',
      '0755',
      '-o',
      'root',
      '-g',
      'root',
      extracted,
      EGRESS.hostBinary
    ]);
  } finally {
    if (container !== null) {
      try {
        run('podman', ['rm', '-f', container]);
      } catch {
        // The container is disposable; a failed cleanup must not mask the
        // digest or install failure that brought us here.
      }
    }

    rmSync(directory, { recursive: true, force: true });
  }

  console.log(`  Installed ${EGRESS.hostBinary} (sha256 ${expected}).`);
}

function checkRepositoryInputs() {
  const required = [
    'apps/server/Containerfile',
    'apps/web/Containerfile',
    'deploy/quadlet/playliberty-web.yaml',
    'deploy/quadlet/playliberty-web.kube',
    'deploy/systemd/playliberty-egress.service',
    'deploy/egress/egress-up.sh',
    'deploy/egress/egress-down.sh',
    'deploy/egress/egress-run.sh',
    'deploy/egress/egress.env.example',
    'mise.toml'
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
  const manifest = path.join(
    repoRoot,
    'deploy',
    'quadlet',
    'playliberty-web.yaml'
  );
  const unit = path.join(repoRoot, 'deploy', 'quadlet', 'playliberty-web.kube');

  console.log('\nNext steps (not executed by this script):');
  console.log('  # Web pod (user scope)');
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
  console.log(
    '  # Egress agent (system scope; the unit expects /opt/playliberty)'
  );
  console.log(
    '  sudo install -m 0644 deploy/systemd/playliberty-egress.service /etc/systemd/system/'
  );
  console.log(
    '  sudo install -m 0755 deploy/egress/egress-up.sh /usr/local/lib/playliberty/egress-up'
  );
  console.log(
    '  sudo install -m 0755 deploy/egress/egress-down.sh /usr/local/lib/playliberty/egress-down'
  );
  console.log(
    '  sudo install -m 0755 deploy/egress/egress-run.sh /usr/local/lib/playliberty/egress-run'
  );
  console.log(
    '  sudo install -m 0600 deploy/egress/egress.env.example /etc/playliberty/egress.env'
  );
  console.log('  # Edit /etc/playliberty/egress.env, then:');
  console.log('  sudo systemctl daemon-reload');
  console.log('  sudo systemctl enable --now playliberty-egress.service');
}

async function main() {
  if (values.help) {
    console.log(USAGE);
    return;
  }

  validatePangolinInputs();

  if (dryRun) {
    console.log(
      'Dry run: no build, directory, pool, AppArmor, firewall, binary or secret mutation will run.'
    );
  }

  checkRepositoryInputs();
  ensureHostNode();
  buildImages();
  ensureStorage();
  ensureEgressHost();
  ensureHostYtdlp();
  await ensureEdge();
  const publicOrigin = await ensurePublicOrigin();
  await ensureAdmin();
  await ensurePangolin(publicOrigin);
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
