const path = require('node:path');

const expoPreset = require('jest-expo/jest-preset');

module.exports = {
  preset: 'jest-expo',
  testMatch: ['<rootDir>/src/**/*.test.{ts,tsx}'],
  // RN 0.88 cold module graphs exceed the 5s default when workers run in parallel.
  testTimeout: 15000,
  // The icon package re-exports about 5000 one-file icons, so map its entry to a
  // stub; the preset's own mappings stay.
  moduleNameMapper: {
    ...expoPreset.moduleNameMapper,
    '^@tabler/icons-react-native$': '<rootDir>/jest/tablerIconsMock.cjs'
  },
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
  ],
  setupFilesAfterEnv: ['<rootDir>/jest/reduceMotion.js']
};
