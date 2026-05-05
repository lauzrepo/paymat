// Minimal @prisma/client mock that provides Prisma.Decimal without requiring
// the generated .prisma/client (which needs Node ≥24 / prisma generate to build).
const { Decimal } = require('@prisma/client/runtime/client');

// Export Decimal at top level (for `import { Decimal } from '@prisma/client/runtime/library'`)
// and nested under Prisma (for `import { Prisma } from '@prisma/client'; Prisma.Decimal`)
module.exports = {
  Decimal,
  Prisma: { Decimal },
  PrismaClient: jest.fn(),
};
