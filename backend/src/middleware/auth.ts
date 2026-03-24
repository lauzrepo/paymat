import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/environment';
import { AppError } from './errorHandler';

interface JWTPayload {
  userId: string;
  email: string;
  organizationId: string;
  role: string;
}

export const authenticateToken = (req: Request, _res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      throw new AppError(401, 'Access token required');
    }

    const payload = jwt.verify(token, config.jwt.secret) as JWTPayload;

    if (req.organization && payload.organizationId !== req.organization.id) {
      throw new AppError(403, 'Token not valid for this organization');
    }

    req.user = payload;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return next(new AppError(401, 'Token expired'));
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return next(new AppError(401, 'Invalid token'));
    }
    next(error);
  }
};

export const requireRole = (...roles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError(401, 'Authentication required'));
    }
    if (!roles.includes(req.user.role)) {
      return next(new AppError(403, 'Insufficient permissions'));
    }
    next();
  };
};

export const generateTokens = (userId: string, email: string, organizationId: string, role: string) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const accessToken = jwt.sign({ userId, email, organizationId, role }, config.jwt.secret, {
    expiresIn: config.jwt.accessTokenExpiry as any,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const refreshToken = jwt.sign({ userId, email, organizationId, role }, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshTokenExpiry as any,
  });

  return { accessToken, refreshToken };
};

export const verifyRefreshToken = (token: string): JWTPayload => {
  return jwt.verify(token, config.jwt.refreshSecret) as JWTPayload;
};
