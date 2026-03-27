import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/environment';
import { AppError } from './errorHandler';

interface SuperAdminJWTPayload {
  superAdminId: string;
  email: string;
}

export const authenticateSuperAdmin = (req: Request, _res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) throw new AppError(401, 'Access token required');

    const payload = jwt.verify(token, config.superAdmin.jwtSecret) as SuperAdminJWTPayload;
    req.superAdmin = payload;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) return next(new AppError(401, 'Token expired'));
    if (error instanceof jwt.JsonWebTokenError) return next(new AppError(401, 'Invalid token'));
    next(error);
  }
};

export const generateSuperAdminTokens = (superAdminId: string, email: string) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const accessToken = jwt.sign({ superAdminId, email }, config.superAdmin.jwtSecret, { expiresIn: '15m' as any });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const refreshToken = jwt.sign({ superAdminId, email }, config.superAdmin.jwtRefreshSecret, { expiresIn: '7d' as any });
  return { accessToken, refreshToken };
};

export const verifySuperAdminRefreshToken = (token: string): SuperAdminJWTPayload => {
  return jwt.verify(token, config.superAdmin.jwtRefreshSecret) as SuperAdminJWTPayload;
};
