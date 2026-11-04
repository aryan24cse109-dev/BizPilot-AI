import prisma from '../config/db.js';
import { GeminiProvider } from '../integrations/ai/gemini.provider.js';
import { SarvamProvider } from '../integrations/ai/sarvam.provider.js';
import { InvoiceService } from './invoice.service.js';
import { computeInvoiceTotals } from '../utils/decimal.js';

export class AIService {
  static getProvider(type = 'gemini') {
    if (type === 'sarvam') return new SarvamProvider();
    return new GeminiProvider();
  }

  /**
   * Handle natural language query from user
   */
  static async handleChatQuery({ userId, workspaceId, message, conversationId, language = 'en' }) {
    // 1. Get or create AIConversation
    let conversation;
    if (conversationId) {
      conversation = await prisma.aIConversation.findUnique({
        where: { id: conversationId },
        include: { messages: { take: 10, orderBy: { createdAt: 'desc' } } }
      });
    }

    if (!conversation) {
      conversation = await prisma.aIConversation.create({
        data: {
          userId,
          workspaceId,
          title: message.slice(0, 40) + '...',
        }
      });
    }

    // Record user message
    await prisma.aIMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'user',
        content: message,
      }
    });

    // 2. Fetch workspace context (clients, currency)
    const [connections, workspace] = await Promise.all([
      prisma.connection.findMany({
        where: {
          OR: [
            { senderId: userId, status: 'ACCEPTED' },
            { receiverId: userId, status: 'ACCEPTED' }
          ]
        },
        include: {
          sender: { select: { id: true, name: true, username: true, email: true } },
          receiver: { select: { id: true, name: true, username: true, email: true } },
        }
      }),
      prisma.businessWorkspace.findUnique({
        where: { id: workspaceId },
        include: { businessProfile: true }
      })
    ]);

    const clients = connections.map(c => c.senderId === userId ? c.receiver : c.sender);

    // 3. Process query via AI Provider
    const provider = this.getProvider();
    const result = await provider.processQuery(message, {
      user: { id: userId },
      workspace,
      clients,
    });

    let toolResult = null;
    let actionLog = null;

    // 4. Controlled Backend Tool Calling
    if (result.intent === 'GET_COLLECTION_SUMMARY') {
      // Query REAL verified database records
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const [allPayments, monthPayments] = await Promise.all([
        prisma.payment.aggregate({
          where: { workspaceId, status: 'SUCCEEDED' },
          _sum: { amount: true },
          _count: { id: true },
        }),
        prisma.payment.aggregate({
          where: {
            workspaceId,
            status: 'SUCCEEDED',
            paymentDate: { gte: startOfMonth }
          },
          _sum: { amount: true },
          _count: { id: true },
        }),
      ]);

      const totalCollected = Number(allPayments._sum.amount || 0);
      const monthCollected = Number(monthPayments._sum.amount || 0);

      toolResult = {
        totalCollected,
        monthCollected,
        transactionCount: allPayments._count.id,
        currency: workspace?.currency || 'INR',
      };

      result.message = `Verified collection records from database: You have collected **${workspace?.currency || 'INR'} ${monthCollected.toLocaleString('en-IN')}** this month across ${monthPayments._count.id} payments (Total lifetime: ${workspace?.currency || 'INR'} ${totalCollected.toLocaleString('en-IN')}).`;

    } else if (result.intent === 'GET_PENDING_INVOICES' || result.intent === 'GET_INVOICES') {
      const pendingInvoices = await prisma.invoice.findMany({
        where: {
          workspaceId,
          status: { in: ['SENT', 'VIEWED', 'PARTIALLY_PAID'] },
          isArchived: false,
        },
        include: { client: { select: { name: true } } },
        take: 5,
        orderBy: { dueDate: 'asc' }
      });

      toolResult = pendingInvoices.map(i => ({
        invoiceNumber: i.invoiceNumber,
        client: i.client.name,
        balanceDue: Number(i.balanceDue),
        dueDate: i.dueDate,
        status: i.status,
      }));

      const totalPending = pendingInvoices.reduce((sum, i) => sum + Number(i.balanceDue), 0);
      result.message = `You have **${pendingInvoices.length} pending invoices** with a total outstanding balance of **${workspace?.currency || 'INR'} ${totalPending.toLocaleString('en-IN')}**.`;

    } else if (result.intent === 'GET_OVERDUE_INVOICES') {
      const now = new Date();
      const overdueInvoices = await prisma.invoice.findMany({
        where: {
          workspaceId,
          dueDate: { lt: now },
          balanceDue: { gt: 0 },
          status: { notIn: ['PAID', 'CANCELLED', 'DRAFT'] },
          isArchived: false,
        },
        include: { client: { select: { name: true } } }
      });

      toolResult = overdueInvoices.map(i => ({
        invoiceNumber: i.invoiceNumber,
        client: i.client.name,
        balanceDue: Number(i.balanceDue),
        dueDate: i.dueDate,
      }));

      const totalOverdue = overdueInvoices.reduce((sum, i) => sum + Number(i.balanceDue), 0);
      result.message = overdueInvoices.length > 0 
        ? `Found **${overdueInvoices.length} overdue invoices** requiring urgent follow-up, totaling **${workspace?.currency || 'INR'} ${totalOverdue.toLocaleString('en-IN')}**.`
        : `Great news! You currently have zero overdue invoices in this workspace.`;

    } else if (result.intent === 'CREATE_INVOICE' && result.draft) {
      // Rule 15: "No automatically sending AI-generated invoices without confirmation.
      // Prepare a structured invoice draft, and request user confirmation before saving or sending it."
      let clientId = result.parameters.clientId;

      // If client not resolved, look up first matched or create an invite record
      if (!clientId && clients.length > 0) {
        const queryName = (result.parameters.clientQuery || '').toLowerCase();
        const found = clients.find(c => c.name.toLowerCase().includes(queryName) || c.username.toLowerCase().includes(queryName));
        if (found) clientId = found.id;
        else clientId = clients[0].id; // Fallback to connected client
      }

      if (clientId) {
        result.draft.clientId = clientId;
        const targetClient = clients.find(c => c.id === clientId) || { name: result.draft.clientName };
        result.draft.clientName = targetClient.name;

        // Compute exact calculations
        const totals = computeInvoiceTotals(result.draft.items, result.draft.taxRate || 18, 0, 0);
        result.draft.subtotal = Number(totals.subtotal);
        result.draft.taxAmount = Number(totals.taxAmount);
        result.draft.totalAmount = Number(totals.totalAmount);
        result.draft.balanceDue = Number(totals.balanceDue);

        // Store AIActionLog for confirmation
        actionLog = await prisma.aIActionLog.create({
          data: {
            conversationId: conversation.id,
            workspaceId,
            intent: 'CREATE_INVOICE',
            parameters: result.draft,
            isConfirmed: false,
          }
        });

        result.actionLogId = actionLog.id;
      } else {
        result.missingFields = ['client'];
        result.requiresConfirmation = false;
        result.message = `You do not have a connected client named "${result.parameters.clientQuery}". Please connect with the client in the Clients tab first or specify an existing connection.`;
      }
    }

    // 5. Store AI response message
    const assistantMessage = await prisma.aIMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'assistant',
        content: result.message,
        intent: result.intent,
        toolCalls: result.parameters,
        toolResult: toolResult || result.draft,
      }
    });

    return {
      conversationId: conversation.id,
      messageId: assistantMessage.id,
      intent: result.intent,
      message: result.message,
      missingFields: result.missingFields || [],
      requiresConfirmation: result.requiresConfirmation || false,
      draft: result.draft || null,
      actionLogId: actionLog?.id || null,
      toolResult,
    };
  }

  /**
   * User confirms or edits the AI-prepared invoice draft
   */
  static async executeAction({ actionLogId, userId, workspaceId, confirmed, overrides = {} }) {
    const actionLog = await prisma.aIActionLog.findUnique({
      where: { id: actionLogId },
    });

    if (!actionLog) throw new Error('Action draft expired or not found.');
    if (actionLog.workspaceId !== workspaceId) throw new Error('Unauthorized action execution.');
    if (actionLog.isConfirmed) throw new Error('This draft has already been confirmed and executed.');

    if (!confirmed) {
      await prisma.aIActionLog.update({
        where: { id: actionLogId },
        data: {
          isConfirmed: false,
          executionResult: { status: 'CANCELLED_BY_USER' },
        }
      });
      return { status: 'CANCELLED', message: 'Invoice draft was discarded by user.' };
    }

    const params = {
      ...actionLog.parameters,
      ...overrides,
    };

    // Save authoritative invoice to database via InvoiceService
    const invoice = await InvoiceService.createInvoice({
      workspaceId,
      actorId: userId,
      clientId: params.clientId,
      dueDate: params.dueDate || new Date(Date.now() + 14 * 86400000).toISOString(),
      currency: params.currency || 'INR',
      items: params.items || [{ description: params.description || 'Services', quantity: 1, unitPrice: params.amount }],
      taxRate: params.taxRate !== undefined ? Number(params.taxRate) : 18,
      discountRate: params.discountRate !== undefined ? Number(params.discountRate) : 0,
      notes: params.notes || 'Created via BizPilot AI Assistant',
      isDraft: Boolean(params.isDraft), // If false, saved and sent immediately
    });

    // Mark Action Log as confirmed and executed
    await prisma.aIActionLog.update({
      where: { id: actionLogId },
      data: {
        isConfirmed: true,
        executedAt: new Date(),
        executionResult: {
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          totalAmount: invoice.totalAmount.toString(),
        }
      }
    });

    return {
      status: 'EXECUTED',
      invoice,
      message: `Invoice ${invoice.invoiceNumber} has been successfully created in the database and sent to client!`,
    };
  }

  /**
   * Get AI conversation history
   */
  static async getConversation(conversationId, userId) {
    return await prisma.aIConversation.findFirst({
      where: { id: conversationId, userId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });
  }

  /**
   * List recent AI conversations
   */
  static async listConversations(userId, workspaceId) {
    return await prisma.aIConversation.findMany({
      where: { userId, workspaceId },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    });
  }
}
