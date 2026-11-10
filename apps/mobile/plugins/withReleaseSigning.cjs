const { withAppBuildGradle } = require('expo/config-plugins');

const PROPERTIES = [
  'PLAYLIBERTY_RELEASE_STORE_FILE',
  'PLAYLIBERTY_RELEASE_STORE_PASSWORD',
  'PLAYLIBERTY_RELEASE_KEY_ALIAS',
  'PLAYLIBERTY_RELEASE_KEY_PASSWORD'
];

const RELEASE_SIGNING = `
    signingConfigs {
        release {
            storeFile project.findProperty('PLAYLIBERTY_RELEASE_STORE_FILE') ? file(project.findProperty('PLAYLIBERTY_RELEASE_STORE_FILE')) : null
            storePassword project.findProperty('PLAYLIBERTY_RELEASE_STORE_PASSWORD')
            keyAlias project.findProperty('PLAYLIBERTY_RELEASE_KEY_ALIAS')
            keyPassword project.findProperty('PLAYLIBERTY_RELEASE_KEY_PASSWORD')
        }
    }`;

const RELEASE_SIGNING_CHECK = `
def playlibertyMissingReleaseSigning = [
${PROPERTIES.map(name => `    '${name}'`).join(',\n')}
].findAll { !project.hasProperty(it) }

afterEvaluate {
    tasks.matching { it.name == 'preReleaseBuild' }.configureEach {
        doFirst {
            if (!playlibertyMissingReleaseSigning.isEmpty()) {
                throw new GradleException('Missing release signing properties: ' + playlibertyMissingReleaseSigning.join(', '))
            }
        }
    }
}
`;

/* Prebuild regenerates the Android project, so the release signing config must
 * be inserted by a mod rather than edited into the generated file. */
module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, config => {
    if (config.modResults.language !== 'groovy') {
      throw new Error('Release signing needs the Groovy Android build file.');
    }

    let contents = config.modResults.contents;

    if (!contents.includes('signingConfigs.release')) {
      const buildTypes = /\n    buildTypes\s*\{/;

      if (!buildTypes.test(contents)) {
        throw new Error('Release signing could not find the buildTypes block.');
      }

      contents = contents.replace(buildTypes, `${RELEASE_SIGNING}$&`);
    }

    const releaseSigning =
      /(release\s*\{[^}]*?signingConfig\s+)signingConfigs\.debug/;

    if (!releaseSigning.test(contents)) {
      throw new Error(
        'Release signing could not find the debug-signed release block.'
      );
    }

    contents = contents.replace(releaseSigning, '$1signingConfigs.release');

    if (!contents.includes('playlibertyMissingReleaseSigning')) {
      contents += RELEASE_SIGNING_CHECK;
    }

    config.modResults.contents = contents;
    return config;
  });
};
