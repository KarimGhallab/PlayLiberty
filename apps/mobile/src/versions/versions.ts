import Constants from 'expo-constants';

const PLAIN_VERSION = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const SUFFIXED_VERSION = /^\d+\.\d+\.\d+[-+]/;

/*
 * Android caps a version code at 2,100,000,000. The fixed decimal layout keeps
 * every semver bump monotonic; a component that overflows would collide with
 * another version's code.
 */
export function androidVersionCode(version: string): number {
  if (SUFFIXED_VERSION.test(version)) {
    throw new Error(
      `The app version "${version}" has a suffix; a release is a plain major.minor.patch version.`
    );
  }

  const match = PLAIN_VERSION.exec(version);

  if (match === null) {
    throw new Error(
      `The app version "${version}" is not a plain major.minor.patch version.`
    );
  }

  const [, majorText = '0', minorText = '0', patchText = '0'] = match;
  const major = { name: 'major', value: Number(majorText), max: 2099 };
  const minor = { name: 'minor', value: Number(minorText), max: 999 };
  const patch = { name: 'patch', value: Number(patchText), max: 999 };

  for (const part of [major, minor, patch]) {
    if (part.value > part.max) {
      throw new Error(
        `The app version "${version}" has a ${part.name} above ${part.max}.`
      );
    }
  }

  return major.value * 1_000_000 + minor.value * 1_000 + patch.value;
}

/** The version embedded in the installed binary, or null when it carries none. */
export function runningVersion(): string | null {
  const version = Constants.expoConfig?.version;

  return typeof version === 'string' && version.trim().length > 0
    ? version
    : null;
}
