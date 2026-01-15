import { Request, Response } from 'express';
import prisma from '../config/database';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import logger from '../utils/logger';

/**
 * Export user data (GDPR compliance)
 * GET /api/gdpr/export-data
 */
export const exportUserData = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, 'Not authenticated');
  }

  const userId = req.user.userId;

  // Gather all user data
  const [user, payments, subscriptions, invoices, paymentMethods, auditLogs] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        createdAt: true,
        updatedAt: true,
        gdprConsent: true,
        gdprConsentDate: true,
      },
    }),
    prisma.payment.findMany({ where: { userId } }),
    prisma.subscription.findMany({ where: { userId } }),
    prisma.invoice.findMany({ where: { userId } }),
    prisma.paymentMethod.findMany({ where: { userId } }),
    prisma.auditLog.findMany({ where: { userId } }),
  ]);

  if (!user) {
    throw new AppError(404, 'User not found');
  }

  const exportData = {
    user,
    payments,
    subscriptions,
    invoices,
    paymentMethods: paymentMethods.map((pm) => ({
      ...pm,
      helcimCardToken: '***REDACTED***', // Don't export full token
    })),
    auditLogs,
    exportDate: new Date().toISOString(),
    note: 'This file contains all your personal data stored in our system',
  };

  // Log audit
  await prisma.auditLog.create({
    data: {
      userId,
      action: 'GDPR_DATA_EXPORT',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    },
  });

  logger.info(`User data exported: ${req.user.email}`);

  // Set headers for JSON download
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="user-data-${userId}.json"`);

  res.status(200).json(exportData);
});

/**
 * Delete user account (GDPR Right to be Forgotten)
 * POST /api/gdpr/delete-account
 */
export const deleteUserAccount = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, 'Not authenticated');
  }

  const { confirmation } = req.body;

  // Require explicit confirmation
  if (confirmation !== 'DELETE MY ACCOUNT') {
    throw new AppError(400, 'Invalid confirmation. Please type "DELETE MY ACCOUNT" to confirm');
  }

  const userId = req.user.userId;

  // Check for active subscriptions
  const activeSubscriptions = await prisma.subscription.findMany({
    where: {
      userId,
      status: 'active',
    },
  });

  if (activeSubscriptions.length > 0) {
    throw new AppError(
      400,
      'Please cancel all active subscriptions before deleting your account'
    );
  }

  // Check for pending invoices
  const pendingInvoices = await prisma.invoice.findMany({
    where: {
      userId,
      status: { in: ['pending', 'overdue'] },
    },
  });

  if (pendingInvoices.length > 0) {
    throw new AppError(400, 'Please resolve all pending invoices before deleting your account');
  }

  // Log audit before deletion
  await prisma.auditLog.create({
    data: {
      userId,
      action: 'GDPR_ACCOUNT_DELETION_REQUESTED',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    },
  });

  // Soft delete user (mark as deleted instead of hard delete for compliance)
  await prisma.user.update({
    where: { id: userId },
    data: {
      deletedAt: new Date(),
      // Anonymize data
      email: `deleted-${userId}@deleted.local`,
      firstName: 'Deleted',
      lastName: 'User',
      passwordHash: 'DELETED',
      helcimCustomerId: null,
    },
  });

  // Delete payment methods
  await prisma.paymentMethod.deleteMany({
    where: { userId },
  });

  logger.info(`User account deleted: ${req.user.email}`);

  res.status(200).json({
    status: 'success',
    message: 'Your account has been successfully deleted',
  });
});

/**
 * Get GDPR compliance status
 * GET /api/gdpr/status
 */
export const getGdprStatus = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, 'Not authenticated');
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: {
      gdprConsent: true,
      gdprConsentDate: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw new AppError(404, 'User not found');
  }

  const dataCount = {
    payments: await prisma.payment.count({ where: { userId: req.user.userId } }),
    subscriptions: await prisma.subscription.count({ where: { userId: req.user.userId } }),
    invoices: await prisma.invoice.count({ where: { userId: req.user.userId } }),
    paymentMethods: await prisma.paymentMethod.count({ where: { userId: req.user.userId } }),
    auditLogs: await prisma.auditLog.count({ where: { userId: req.user.userId } }),
  };

  res.status(200).json({
    status: 'success',
    data: {
      gdprConsent: user.gdprConsent,
      gdprConsentDate: user.gdprConsentDate,
      accountCreated: user.createdAt,
      dataCount,
    },
  });
});
