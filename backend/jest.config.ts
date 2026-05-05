import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  setupFiles: ['<rootDir>/tests/setup.ts'],
  clearMocks: true,
  moduleNameMapper: {
    // Redirect all imports of src/config/database to the mock
    '.*/config/database': '<rootDir>/tests/helpers/prismaMock.ts',
    // Provide Prisma.Decimal without requiring the generated .prisma/client
    // (generated client needs Node ≥24; local dev runs Node 18)
    '^@prisma/client$': '<rootDir>/tests/helpers/prismaClientMock.ts',
    '^@prisma/client/runtime/library$': '<rootDir>/tests/helpers/prismaClientMock.ts',
  },
  forceExit: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/services/**/*.ts',
    'src/controllers/**/*.ts',
    '!src/**/*.d.ts',
  ],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: './tsconfig.test.json',
      diagnostics: false, // type-checking is handled by tsc; avoids issues with @prisma/client mock
    }],
  },
};

export default config;
