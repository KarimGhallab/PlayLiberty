import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const repoRoot = path.resolve(root, '../..');
const SIGNING_KEYS = [
  'PLAYLIBERTY_RELEASE_STORE_FILE',
  'PLAYLIBERTY_RELEASE_STORE_PASSWORD',
  'PLAYLIBERTY_RELEASE_KEY_ALIAS',
  'PLAYLIBERTY_RELEASE_KEY_PASSWORD'
];
const propertiesPath = path.resolve(
  process.env.PLAYLIBERTY_RELEASE_PROPERTIES ??
    path.join(homedir(), '.config', 'playliberty', 'android-release.properties')
);

function fail(message) {
  console.error(message);
  process.exit(1);
}

function assertOutsideRepository(file, label) {
  if (file === repoRoot || file.startsWith(`${repoRoot}${path.sep}`)) {
    fail(`${label} must live outside the repository: ${file}.`);
  }
}

function readProperties(file) {
  if (!existsSync(file)) {
    fail(`Release properties file not found at ${file}.`);
  }

  const values = Object.create(null);

  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();

    if (trimmed === '' || trimmed.startsWith('#')) {
      continue;
    }

    const separator = trimmed.indexOf('=');

    if (separator === -1) {
      continue;
    }

    values[trimmed.slice(0, separator).trim()] = trimmed
      .slice(separator + 1)
      .trim();
  }

  return values;
}

function requiredOrigin() {
  const origin = process.env.EXPO_PUBLIC_API_BASE_URL?.trim() ?? '';

  if (origin === '') {
    fail('EXPO_PUBLIC_API_BASE_URL is required for a release build.');
  }

  let url;

  try {
    url = new URL(origin);
  } catch {
    fail(`EXPO_PUBLIC_API_BASE_URL is not a URL: ${origin}.`);
  }

  if (url.protocol !== 'https:') {
    fail(`EXPO_PUBLIC_API_BASE_URL must be an HTTPS origin: ${origin}.`);
  }

  return origin;
}

const properties = readProperties(propertiesPath);
assertOutsideRepository(propertiesPath, 'The release properties file');
const missing = SIGNING_KEYS.filter(key => !properties[key]);

if (missing.length > 0) {
  fail(
    `Missing release signing values in ${propertiesPath}: ${missing.join(', ')}.`
  );
}

const storeFile = path.isAbsolute(properties.PLAYLIBERTY_RELEASE_STORE_FILE)
  ? properties.PLAYLIBERTY_RELEASE_STORE_FILE
  : path.resolve(
      path.dirname(propertiesPath),
      properties.PLAYLIBERTY_RELEASE_STORE_FILE
    );

if (!existsSync(storeFile)) {
  fail(`The release keystore does not exist at ${storeFile}.`);
}

assertOutsideRepository(storeFile, 'The release keystore');

const origin = requiredOrigin();
const env = {
  ...process.env,
  EXPO_NO_DOTENV: '1',
  EXPO_PUBLIC_API_BASE_URL: origin,
  ORG_GRADLE_PROJECT_PLAYLIBERTY_RELEASE_STORE_FILE: storeFile,
  ORG_GRADLE_PROJECT_PLAYLIBERTY_RELEASE_STORE_PASSWORD:
    properties.PLAYLIBERTY_RELEASE_STORE_PASSWORD,
  ORG_GRADLE_PROJECT_PLAYLIBERTY_RELEASE_KEY_ALIAS:
    properties.PLAYLIBERTY_RELEASE_KEY_ALIAS,
  ORG_GRADLE_PROJECT_PLAYLIBERTY_RELEASE_KEY_PASSWORD:
    properties.PLAYLIBERTY_RELEASE_KEY_PASSWORD
};

execFileSync(
  'pnpm',
  [
    'exec',
    'expo',
    'prebuild',
    '--platform',
    'android',
    '--clean',
    '--no-install'
  ],
  { cwd: root, env, stdio: 'inherit' }
);

const android = path.join(root, 'android');
const gradlew = path.join(
  android,
  process.platform === 'win32' ? 'gradlew.bat' : 'gradlew'
);

execFileSync(gradlew, ['assembleRelease'], {
  cwd: android,
  env,
  stdio: 'inherit',
  shell: process.platform === 'win32'
});

const version = JSON.parse(
  readFileSync(path.join(root, 'package.json'), 'utf8')
).version;
const built = path.join(
  android,
  'app',
  'build',
  'outputs',
  'apk',
  'release',
  'app-release.apk'
);

if (!existsSync(built)) {
  fail(`The release build produced no APK at ${built}.`);
}

const output = path.join(root, 'dist', `playliberty-${version}.apk`);

mkdirSync(path.dirname(output), { recursive: true });
copyFileSync(built, output);
console.log(`Release APK: ${output}`);
