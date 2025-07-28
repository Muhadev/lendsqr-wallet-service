// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup.ts'],
  roots: ['<rootDir>/src'],
  testMatch: [
    '<rootDir>/src/tests/**/*.test.ts',
    '<rootDir>/src/**/__tests__/**/*.test.ts'
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/tests/**/*',
    '!src/**/*.d.ts',
    '!src/config/**/*',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  testTimeout: 30000,
  detectOpenHandles: true,
  forceExit: true,
  verbose: true,
  maxWorkers: 1, // Run tests sequentially to avoid database conflicts
  
  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,
  
  // Handle ES modules
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: false,
      tsconfig: {
        module: 'commonjs'
      }
    }],
  },
};