import { Request, Response, NextFunction } from 'express';
import userService from '../services/userService';
import { generateTokens, verifyRefreshToken } from '../middleware/auth';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import logger from '../utils/logger';
import prisma from '../config/database';

/**
 * Register a new user
 * POST /api/auth/register
 */
export const register = asyncHandler(async (req: Request, res: Response) => {
  const { email, password, firstName, lastName, gdprConsent } = req.body;

  const user = await userService.createUser({
    email,
    password,
    firstName,
    lastName,
    gdprConsent,
  });

  const { accessToken, refreshToken } = generateTokens(user.id, user.email);

  // Log audit
  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: 'USER_REGISTERED',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    },
  });

  logger.info(`New user registered: ${user.email}`);

  res.status(201).json({
    status: 'success',
    data: {
      user,
      accessToken,
      refreshToken,
    },
  });
});

/**
 * Login user
 * POST /api/auth/login
 */
export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const user = await userService.authenticateUser(email, password);

  const { accessToken, refreshToken } = generateTokens(user.id, user.email);

  // Log audit
  await prisma.auditLog.create({
    data: {
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
  // In a more complex system, you would invalidate the refresh token here
  // For now, we'll just log the action

  if (req.user) {
    await prisma.auditLog.create({
      data: {
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

      // Verify user still exists
      const user = await userService.getUserById(payload.userId);

      if (!user) {
        throw new AppError(401, 'User not found');
      }

      const { accessToken, refreshToken: newRefreshToken } = generateTokens(
        user.id,
        user.email
      );

      res.status(200).json({
        status: 'success',
        data: {
          accessToken,
          refreshToken: newRefreshToken,
        },
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
    data: {
      user,
    },
  });
});

/**
 * Forgot password
 * POST /api/auth/forgot-password
 */
export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;

  // In production, this would:
  // 1. Generate a reset token
  // 2. Store it in the database
  // 3. Send an email with the reset link
  // For now, we'll just log it

  logger.info(`Password reset requested for: ${email}`);

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

  // In production, this would:
  // 1. Verify the reset token
  // 2. Update the password
  // 3. Invalidate the token
  // For now, we'll just log it

  logger.info(`Password reset completed with token: ${token}`);

  res.status(200).json({
    status: 'success',
    message: 'Password reset successfully',
  });
});
