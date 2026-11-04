import { InvoiceService } from '../services/invoice.service.js';
import { PdfService } from '../services/pdf.service.js';

export class InvoiceController {
  static async createInvoice(req, res, next) {
    try {
      const invoice = await InvoiceService.createInvoice({
        workspaceId: req.workspace.id,
        actorId: req.user.id,
        ...req.body,
      });

      res.status(201).json({
        success: true,
        message: `Invoice ${invoice.invoiceNumber} created successfully.`,
        data: invoice,
      });
    } catch (err) {
      next(err);
    }
  }

  static async listWorkspaceInvoices(req, res, next) {
    try {
      const data = await InvoiceService.listWorkspaceInvoices(req.workspace.id, req.query);
      res.json({ success: true, ...data });
    } catch (err) {
      next(err);
    }
  }

  static async listClientInvoices(req, res, next) {
    try {
      const data = await InvoiceService.listClientInvoices(req.user.id, req.query);
      res.json({ success: true, ...data });
    } catch (err) {
      next(err);
    }
  }

  static async getInvoice(req, res, next) {
    try {
      const invoice = await InvoiceService.getInvoiceById(req.params.id, req.user.id);
      res.json({ success: true, data: invoice });
    } catch (err) {
      next(err);
    }
  }

  static async updateInvoice(req, res, next) {
    try {
      const invoice = await InvoiceService.updateInvoice(
        req.params.id,
        req.workspace.id,
        req.user.id,
        req.body
      );
      res.json({
        success: true,
        message: 'Invoice draft updated successfully.',
        data: invoice,
      });
    } catch (err) {
      next(err);
    }
  }

  static async sendInvoice(req, res, next) {
    try {
      const invoice = await InvoiceService.sendInvoice(
        req.params.id,
        req.workspace.id,
        req.user.id
      );
      res.json({
        success: true,
        message: `Invoice ${invoice.invoiceNumber} sent to client.`,
        data: invoice,
      });
    } catch (err) {
      next(err);
    }
  }

  static async cancelInvoice(req, res, next) {
    try {
      const invoice = await InvoiceService.cancelInvoice(
        req.params.id,
        req.workspace.id,
        req.user.id,
        req.body?.reason
      );
      res.json({
        success: true,
        message: 'Invoice cancelled successfully.',
        data: invoice,
      });
    } catch (err) {
      next(err);
    }
  }

  static async downloadPdf(req, res, next) {
    try {
      const invoice = await InvoiceService.getInvoiceById(req.params.id, req.user.id);
      const pdfBuffer = await PdfService.generateInvoicePdf(invoice);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=Invoice-${invoice.invoiceNumber}.pdf`);
      res.send(pdfBuffer);
    } catch (err) {
      next(err);
    }
  }
}
