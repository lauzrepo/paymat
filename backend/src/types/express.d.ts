import { Organization } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        organizationId: string;
        role: string;
      };
      organization?: Organization;
    }
  }
}

export {};
