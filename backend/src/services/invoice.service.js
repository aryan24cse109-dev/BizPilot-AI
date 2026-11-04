import prisma from '../config/db.js';
import { computeInvoiceTotals } from '../utils/decimal.js';

export class InvoiceService {
  /**
   * Generate next sequential invoice number for workspace in current calendar year.
   * Format: INV-{YYYY}-{0001}
   */
  static async getNextInvoiceNumber(tx, workspaceId, prefix = 'INV') {
    const year = new Date().getFullYear();

    const sequence = await tx.invoiceSequence.upsert({
      where: {
        workspaceId_year_prefix: {
          workspaceId,
          year,
          prefix,
        }
      },
      create: {
        workspaceId,
        year,
        prefix,
        currentSeq: 1,
      },
      update: {
        currentSeq: {
          increment: 1,
        }
      }
    });

    const seqNumber = String(sequence.currentSeq).padStart(4, '0');
    return `${prefix}-${year}-${seqNumber}`;
  }

  /**
   * Create an invoice
   */
  static async createInvoice({
    workspaceId,
    actorId,
    clientId,
    dueDate,
    currency = 'INR',
    items,
    taxRate = 0,
    discountRate = 0,
    notes,
    terms,
    isDraft = false,
  }) {
    // Verify client exists
    const client = await prisma.user.findUnique({
      where: { id: clientId }
    });
    if (!client) {
      throw new Error(`Client with ID ${clientId} not found.`);
    }

    // Compute all financial figures authoritatively
    const totals = computeInvoiceTotals(items, taxRate, discountRate, 0);

    return await prisma.$transaction(async (tx) => {
      const invoiceNumber = await this.getNextInvoiceNumber(tx, workspaceId);

      const status = isDraft ? 'DRAFT' : 'SENT';

      const invoice = await tx.invoice.create({
        data: {
          workspaceId,
          invoiceNumber,
          clientId,
          status,
          dueDate: new Date(dueDate),
          currency,
          subtotal: totals.subtotal,
          taxRate: totals.taxRate,
          taxAmount: totals.taxAmount,
          discountRate: totals.discountRate,
          discountAmount: totals.discountAmount,
          totalAmount: totals.totalAmount,
          paidAmount: totals.paidAmount,
          balanceDue: totals.balanceDue,
          notes,
          terms,
          sentAt: isDraft ? null : new Date(),
          items: {
            create: totals.processedItems,
          },
          events: {
            create: {
              eventType: isDraft ? 'CREATED_DRAFT' : 'CREATED_AND_SENT',
              description: `Invoice ${invoiceNumber} created (${status}) for client ${client.name}`,
              actorId,
              metadata: {
                totalAmount: totals.totalAmount.toString(),
                currency,
              }
            }
          }
        },
        include: {
          items: true,
          client: {
            select: { id: true, name: true, email: true, username: true }
          },
          workspace: {
            include: { businessProfile: true }
          }
        }
      });

      // Notification to client if sent immediately
      if (!isDraft) {
        await tx.notification.create({
          data: {
            userId: clientId,
            type: 'INVOICE_SENT',
            title: `New Invoice ${invoiceNumber}`,
            message: `You received an invoice of ${currency} ${totals.totalAmount} from ${invoice.workspace.name}`,
            linkUrl: `/invoices/${invoice.id}`,
            metadata: { invoiceId: invoice.id, invoiceNumber },
          }
        });
      }

      await tx.auditLog.create({
        data: {
          userId: actorId,
          workspaceId,
          action: 'INVOICE_CREATED',
          entityType: 'Invoice',
          entityId: invoice.id,
          details: { invoiceNumber, status, total: totals.totalAmount.toString() },
        }
      });

      return invoice;
    }, { maxWait: 15000, timeout: 30000 });
  }

  /**
   * List invoices for a workspace (Business perspective)
   */
  static async listWorkspaceInvoices(workspaceId, { status, search, page = 1, limit = 20, clientId }) {
    const where = {
      workspaceId,
      isArchived: false,
    };

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (clientId) {
      where.clientId = clientId;
    }

    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search, mode: 'insensitive' } },
        { client: { name: { contains: search, mode: 'insensitive' } } },
        { client: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const [invoices, totalCount] = await Promise.all([
      prisma.invoice.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          client: {
            select: { id: true, name: true, email: true, username: true }
          },
          items: true,
          payments: {
            select: { id: true, amount: true, status: true, paymentDate: true }
          }
        }
      }),
      prisma.invoice.count({ where }),
    ]);

    // Check and update overdue status dynamically if needed
    const now = new Date();
    const updatedInvoices = invoices.map((inv) => {
      if (inv.status === 'SENT' && new Date(inv.dueDate) < now && Number(inv.balanceDue) > 0) {
        return { ...inv, status: 'OVERDUE' };
      }
      return inv;
    });

    return {
      invoices: updatedInvoices,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        totalCount,
        totalPages: Math.ceil(totalCount / take),
      }
    };
  }

  /**
   * List received invoices for a client (Client perspective)
   */
  static async listClientInvoices(clientId, { status, search, page = 1, limit = 20 }) {
    const where = {
      clientId,
      status: { not: 'DRAFT' }, // Clients do not see drafts
      isArchived: false,
    };

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search, mode: 'insensitive' } },
        { workspace: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const [invoices, totalCount] = await Promise.all([
      prisma.invoice.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          workspace: {
            include: { businessProfile: true }
          },
          items: true,
          payments: {
            select: { id: true, amount: true, status: true, paymentDate: true }
          }
        }
      }),
      prisma.invoice.count({ where }),
    ]);

    return {
      invoices,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        totalCount,
        totalPages: Math.ceil(totalCount / take),
      }
    };
  }

  /**
   * Get single invoice with full items and events
   */
  static async getInvoiceById(invoiceId, userId) {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' }
        },
        client: {
          select: { id: true, name: true, email: true, username: true, profile: true }
        },
        workspace: {
          include: { businessProfile: true }
        },
        events: {
          orderBy: { createdAt: 'desc' }
        },
        payments: {
          orderBy: { paymentDate: 'desc' }
        }
      }
    });

    if (!invoice) throw new Error('Invoice not found.');

    // Security check: must be workspace member or recipient client
    const isOwnerOrMember = invoice.workspace.ownerId === userId;
    const isClient = invoice.clientId === userId;

    if (!isOwnerOrMember && !isClient) {
      // Check if user is workspace member
      const member = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: invoice.workspaceId,
            userId,
          }
        }
      });
      if (!member) {
        throw new Error('Access denied. You do not have permission to view this invoice.');
      }
    }

    // If client views invoice for the first time while in SENT status, mark VIEWED
    if (isClient && invoice.status === 'SENT' && !invoice.viewedAt) {
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          status: 'VIEWED',
          viewedAt: new Date(),
          events: {
            create: {
              eventType: 'VIEWED',
              description: `Invoice viewed by client ${invoice.client.name}`,
              actorId: userId,
            }
          }
        }
      });
      invoice.status = 'VIEWED';
    }

    return invoice;
  }

  /**
   * Update draft invoice
   */
  static async updateInvoice(invoiceId, workspaceId, actorId, { dueDate, items, taxRate, discountRate, notes, terms }) {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { items: true }
    });

    if (!invoice || invoice.workspaceId !== workspaceId) {
      throw new Error('Invoice not found in this workspace.');
    }

    if (invoice.status !== 'DRAFT') {
      throw new Error(`Cannot modify invoice with status ${invoice.status}. Only DRAFT invoices can be edited.`);
    }

    const currentTaxRate = taxRate !== undefined ? taxRate : Number(invoice.taxRate);
    const currentDiscountRate = discountRate !== undefined ? discountRate : Number(invoice.discountRate);
    const lineItems = items || invoice.items;

    const totals = computeInvoiceTotals(lineItems, currentTaxRate, currentDiscountRate, Number(invoice.paidAmount));

    return await prisma.$transaction(async (tx) => {
      // Delete old items and insert updated items if items provided
      if (items) {
        await tx.invoiceItem.deleteMany({ where: { invoiceId } });
      }

      const updated = await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          dueDate: dueDate ? new Date(dueDate) : invoice.dueDate,
          notes: notes !== undefined ? notes : invoice.notes,
          terms: terms !== undefined ? terms : invoice.terms,
          subtotal: totals.subtotal,
          taxRate: totals.taxRate,
          taxAmount: totals.taxAmount,
          discountRate: totals.discountRate,
          discountAmount: totals.discountAmount,
          totalAmount: totals.totalAmount,
          balanceDue: totals.balanceDue,
          ...(items ? { items: { create: totals.processedItems } } : {}),
          events: {
            create: {
              eventType: 'UPDATED',
              description: 'Invoice draft updated',
              actorId,
            }
          }
        },
        include: {
          items: true,
          client: { select: { id: true, name: true, email: true } },
          workspace: { include: { businessProfile: true } }
        }
      });

      return updated;
    }, { maxWait: 15000, timeout: 30000 });
  }

  /**
   * Send draft invoice
   */
  static async sendInvoice(invoiceId, workspaceId, actorId) {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        client: true,
        workspace: true,
      }
    });

    if (!invoice || invoice.workspaceId !== workspaceId) {
      throw new Error('Invoice not found.');
    }

    if (invoice.status !== 'DRAFT') {
      throw new Error(`Invoice is already in ${invoice.status} status.`);
    }

    const updated = await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: 'SENT',
        sentAt: new Date(),
        events: {
          create: {
            eventType: 'SENT',
            description: `Invoice sent to client ${invoice.client.name}`,
            actorId,
          }
        }
      },
      include: {
        items: true,
        client: { select: { id: true, name: true, email: true } },
        workspace: { include: { businessProfile: true } }
      }
    });

    // Notify client
    await prisma.notification.create({
      data: {
        userId: invoice.clientId,
        type: 'INVOICE_SENT',
        title: `New Invoice ${invoice.invoiceNumber}`,
        message: `You received an invoice of ${invoice.currency} ${invoice.totalAmount} from ${invoice.workspace.name}`,
        linkUrl: `/invoices/${invoice.id}`,
      }
    });

    return updated;
  }

  /**
   * Cancel invoice
   */
  static async cancelInvoice(invoiceId, workspaceId, actorId, reason = 'Cancelled by business') {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice || invoice.workspaceId !== workspaceId) {
      throw new Error('Invoice not found.');
    }

    if (invoice.status === 'PAID') {
      throw new Error('Cannot cancel a fully paid invoice. Please process a refund instead.');
    }

    return await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: 'CANCELLED',
        events: {
          create: {
            eventType: 'CANCELLED',
            description: `Invoice cancelled: ${reason}`,
            actorId,
          }
        }
      }
    });
  }
}
