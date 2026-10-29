const path = require('node:path');

module.exports = {
  preset: 'jest-expo',
  testMatch: ['<rootDir>/src/**/*.test.{ts,tsx}'],
  // The preset compiles JS and TypeScript but not `.mjs`, and a dependency that
  // ships only an ESM build still has to be compiled for Jest.
  transform: {
    '^.+\\.mjs$': [
      'babel-jest',
      {
        configFile: path.resolve(__dirname, 'babel.config.cjs'),
        caller: { name: 'metro', bundler: 'jest', platform: 'ios' }
      }
    ]
  },
  // pnpm stores packages under `node_modules/.pnpm`, so the store itself must
  // stay transformable and each native package is named by its prefix.
  transformIgnorePatterns: [
    'node_modules/(?!(.pnpm|@playliberty|@react-native|@expo|@tabler|expo|react-native))'
  ]
};
