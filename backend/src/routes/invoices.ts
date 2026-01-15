import { Router } from 'express';
import * as invoiceController from '../controllers/invoiceController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All invoice routes require authentication
router.use(authenticateToken);

/**
 * @route   GET /api/invoices
 * @desc    Get invoices for user
 * @access  Private
 */
router.get('/', invoiceController.getInvoices);

/**
 * @route   GET /api/invoices/stats
 * @desc    Get invoice statistics
 * @access  Private
 */
router.get('/stats', invoiceController.getInvoiceStats);

/**
 * @route   GET /api/invoices/:id
 * @desc    Get single invoice
 * @access  Private
 */
router.get('/:id', invoiceController.getInvoice);

/**
 * @route   GET /api/invoices/:id/pdf
 * @desc    Get invoice PDF URL
 * @access  Private
 */
router.get('/:id/pdf', invoiceController.getInvoicePdf);

/**
 * @route   POST /api/invoices/:id/send
 * @desc    Send invoice via email
 * @access  Private
 */
router.post('/:id/send', invoiceController.sendInvoice);

export default router;
