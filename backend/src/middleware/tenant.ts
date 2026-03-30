import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { config } from '../config/environment';

export const resolveTenant = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const hostname = req.hostname;
    const headerSlug = req.headers['x-organization-slug'];

    let slug: string;

    if (headerSlug && typeof headerSlug === 'string' && headerSlug.trim()) {
      slug = headerSlug.trim();
    } else if (hostname === 'localhost' || hostname === '127.0.0.1') {
      slug = config.multiTenant.defaultSlug;
    } else {
      slug = hostname.split('.')[0];
    }

    // Fall back to default slug for known hosting domains
    // (e.g. party-house-production.up.railway.app, admin-xxx.vercel.app)
    if (!headerSlug && (hostname.endsWith('.railway.app') || hostname.endsWith('.vercel.app'))) {
      slug = config.multiTenant.defaultSlug;
    }

    const organization = await prisma.organization.findFirst({
      where: { slug, isActive: true },
    });

    if (!organization) {
      res.status(404).json({ status: 'error', message: 'Organization not found' });
      return;
    }

    req.organization = organization;
    next();
  } catch (error) {
    next(error);
  }
};
