import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import userService from '../services/userService';
import { generateTokens, verifyRefreshToken } from '../middleware/auth';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { config } from '../config/environment';
import logger from '../utils/logger';
import prisma from '../config/database';
import { sendPasswordReset } from '../services/emailService';

/**
 * Register a new user
 * POST /api/auth/register
 */
export const register = asyncHandler(async (req: Request, res: Response) => {
  const { email, password, firstName, lastName } = req.body;
  const organizationId = req.organization!.id;

  const user = await userService.createUser({
    organizationId,
    email,
    password,
    firstName,
    lastName,
  });

  const { accessToken, refreshToken } = generateTokens(user.id, user.email, organizationId, user.role);

  await prisma.auditLog.create({
    data: {
      organizationId,
      userId: user.id,
      action: 'USER_REGISTERED',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    },
  });

  logger.info(`New user registered: ${user.email}`);

  res.status(201).json({
    status: 'success',
    data: { user, accessToken, refreshToken },
  });
});

/**
 * Login user
 * POST /api/auth/login
 */
export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const organizationId = req.organization!.id;

  const user = await userService.authenticateUser(organizationId, email, password);

  const { accessToken, refreshToken } = generateTokens(user.id, user.email, organizationId, user.role);

  await prisma.auditLog.create({
    data: {
      organizationId,
      userId: user.id,
      action: 'USER_LOGIN',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    },
  });

  logger.info(`User logged in: ${user.email}`);

  res.status(200).json({
    status: 'success',
    data: {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        createdAt: user.createdAt,
      },
      accessToken,
      refreshToken,
    },
  });
});

/**
 * Logout user
 * POST /api/auth/logout
 */
export const logout = asyncHandler(async (req: Request, res: Response) => {
  if (req.user) {
    await prisma.auditLog.create({
      data: {
        organizationId: req.organization!.id,
        userId: req.user.userId,
        action: 'USER_LOGOUT',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
    });

    logger.info(`User logged out: ${req.user.email}`);
  }

  res.status(200).json({
    status: 'success',
    message: 'Logged out successfully',
  });
});

/**
 * Refresh access token
 * POST /api/auth/refresh-token
 */
export const refreshToken = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { refreshToken: token } = req.body;

    try {
      const payload = verifyRefreshToken(token);

      const user = await userService.getUserById(payload.userId);

      if (!user) {
        throw new AppError(401, 'User not found');
      }

      const { accessToken, refreshToken: newRefreshToken } = generateTokens(
        user.id,
        user.email,
        user.organizationId,
        user.role
      );

      res.status(200).json({
        status: 'success',
        data: { accessToken, refreshToken: newRefreshToken },
      });
    } catch (error) {
      return next(new AppError(401, 'Invalid or expired refresh token'));
    }
  }
);

/**
 * Get current user
 * GET /api/auth/me
 */
export const getCurrentUser = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, 'Not authenticated');
  }

  const user = await userService.getUserById(req.user.userId);

  if (!user) {
    throw new AppError(404, 'User not found');
  }

  res.status(200).json({
    status: 'success',
    data: { user },
  });
});

/**
 * Forgot password
 * POST /api/auth/forgot-password
 */
export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;
  const organizationId = req.organization!.id;

  const user = await prisma.user.findFirst({
    where: { organizationId, email, deletedAt: null },
  });

  if (!user) {
    res.status(200).json({
      status: 'success',
      message: 'If an account with that email exists, a password reset link has been sent',
    });
    return;
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expiry = new Date(Date.now() + 60 * 60 * 1000);

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordResetToken: token, passwordResetExpiry: expiry },
  });

  const origin = req.headers.origin ?? config.email.appUrl;
  const orgSlug = req.organization!.slug;
  // Portal resets include the org slug in the path; admin resets do not
  const isPortal = origin.includes('portal.');
  const resetUrl = isPortal
    ? `${origin}/${orgSlug}/reset-password?token=${token}`
    : `${origin}/reset-password?token=${token}`;

  sendPasswordReset(user.email, {
    recipientName: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email,
    resetUrl,
  }).catch((err) => logger.error('Failed to send password reset email', { err }));

  res.status(200).json({
    status: 'success',
    message: 'If an account with that email exists, a password reset link has been sent',
  });
});

/**
 * Reset password
 * POST /api/auth/reset-password
 */
export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { token, newPassword } = req.body;

  const user = await prisma.user.findFirst({
    where: {
      passwordResetToken: token,
      passwordResetExpiry: { gt: new Date() },
      deletedAt: null,
    },
  });

  if (!user) {
    throw new AppError(400, 'Invalid or expired reset token');
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      passwordResetToken: null,
      passwordResetExpiry: null,
    },
  });

  logger.info(`Password reset completed for user: ${user.email}`);

  res.status(200).json({
    status: 'success',
    message: 'Password reset successfully. You can now log in with your new password.',
  });
});
