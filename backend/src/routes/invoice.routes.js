import { Router } from 'express';
import { InvoiceController } from '../controllers/invoice.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireWorkspace } from '../middleware/workspace.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { createInvoiceSchema, updateInvoiceSchema } from '../validators/invoice.validator.js';

const router = Router();

router.use(authenticate);

// Business endpoints (workspace-isolated)
router.post('/', requireWorkspace(['OWNER', 'ADMIN', 'FINANCE_MANAGER']), validate(createInvoiceSchema), InvoiceController.createInvoice);
router.get('/', requireWorkspace(), InvoiceController.listWorkspaceInvoices);
router.get('/client-received', InvoiceController.listClientInvoices);
router.get('/:id', InvoiceController.getInvoice);
router.put('/:id', requireWorkspace(['OWNER', 'ADMIN', 'FINANCE_MANAGER']), validate(updateInvoiceSchema), InvoiceController.updateInvoice);
router.post('/:id/send', requireWorkspace(['OWNER', 'ADMIN', 'FINANCE_MANAGER']), InvoiceController.sendInvoice);
router.post('/:id/cancel', requireWorkspace(['OWNER', 'ADMIN', 'FINANCE_MANAGER']), InvoiceController.cancelInvoice);
router.get('/:id/pdf', InvoiceController.downloadPdf);

export default router;
