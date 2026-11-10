const path = require('node:path');

/* pnpm does not hoist Expo's own Babel preset into this package, so resolve it
 * through the Expo package that depends on it. */
const expoRoot = path.dirname(require.resolve('expo/package.json'));

module.exports = function babelConfig(api) {
  api.cache(true);

  return {
    presets: [
      require.resolve('babel-preset-expo', {
        paths: [expoRoot]
      })
    ]
  };
};
