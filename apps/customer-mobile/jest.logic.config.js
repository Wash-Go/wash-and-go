/** @type {import('jest').Config} */
// Pure-logic tests only (src/lib/*.spec.ts). RN component tests would need
// jest-expo; the pure helpers here run under plain ts-jest with a self-contained
// tsconfig (the app's expo tsconfig uses bundler resolution that ts-jest can't
// consume directly).
module.exports = {
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
  rootDir: 'src',
  testMatch: ['**/lib/**/*.spec.ts'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      { isolatedModules: true, tsconfig: '<rootDir>/../tsconfig.jest.json' },
    ],
  },
  testEnvironment: 'node',
};
