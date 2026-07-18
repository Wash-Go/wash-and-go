/** @type {import('jest').Config} */
// Only the pure formatter is unit-tested here; RN components are verified by the
// apps bundling. Self-contained tsconfig so ts-jest doesn't load the RN one.
module.exports = {
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
  rootDir: 'src',
  testMatch: ['**/format.spec.ts'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      { isolatedModules: true, tsconfig: '<rootDir>/../tsconfig.jest.json' },
    ],
  },
  testEnvironment: 'node',
};
