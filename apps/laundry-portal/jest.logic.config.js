/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
  rootDir: 'lib',
  testMatch: ['**/*.spec.ts'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      { isolatedModules: true, tsconfig: '<rootDir>/../tsconfig.jest.json' },
    ],
  },
  testEnvironment: 'node',
};
