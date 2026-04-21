// Using `import type` makes this file a TypeScript module, so `declare module`
// below is treated as a module augmentation (merges with existing types) rather
// than an ambient module declaration (which would replace them entirely).
import type { Organization } from '@prisma/client';

declare module 'express-serve-static-core' {
  // @types/express-serve-static-core v5.1.1 widened ParamsDictionary to
  // `{ [key: string]: string | string[] }` for Express 5 array-param support.
  // Our routes use only simple named string parameters, so we narrow it back
  // to `string`. skipLibCheck suppresses the conflicting-index-signature error
  // in .d.ts files while TypeScript resolves params values as string.
  interface ParamsDictionary {
    [key: string]: string;
  }

  // Custom properties added by application middleware.
  interface Request {
    user?: {
      userId: string;
      email: string;
      organizationId: string;
      role: string;
    };
    organization?: Organization;
    superAdmin?: {
      superAdminId: string;
      email: string;
    };
  }
}
