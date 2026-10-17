module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testEnvironment: 'node',
  testRegex: '.e2e-spec.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  moduleNameMapper: {
    '^@iam/(.*)$': '<rootDir>/src/contexts/iam/$1',
    '^@reflection/(.*)$': '<rootDir>/src/contexts/reflection/$1',
    '^@integrations/(.*)$': '<rootDir>/src/contexts/integrations/$1',
    '^@activity/(.*)$': '<rootDir>/src/contexts/activity/$1',
    '^@shared/(.*)$': '<rootDir>/src/shared/$1',
    '^@infrastructure/(.*)$': '<rootDir>/src/infrastructure/$1',
    '^@presentation/(.*)$': '<rootDir>/src/presentation/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  globalSetup: '<rootDir>/test/global-setup.ts',
};
