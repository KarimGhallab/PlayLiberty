const path = require('node:path');

const expoPreset = require('jest-expo/jest-preset');

module.exports = {
  preset: 'jest-expo',
  testMatch: ['<rootDir>/src/**/*.test.{ts,tsx}'],
  // The icon package's root re-exports about 5000 icons, one CJS file each, and
  // every suite that renders a control loaded all of them. The preset's own
  // mappings stay; ours only replaces the icon entry point.
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
