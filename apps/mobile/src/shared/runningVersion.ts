import Constants from 'expo-constants';

/** The version embedded in the installed binary, or null when it carries none. */
export function runningVersion(): string | null {
  const version = Constants.expoConfig?.version;

  return typeof version === 'string' && version.trim().length > 0
    ? version
    : null;
}
