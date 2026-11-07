
import { WORKFLOW_ACTIONS } from '../../../utils/constants.js';

export const WORKFLOW_RULES = Object.freeze({
  // Retrieval actions
  [WORKFLOW_ACTIONS.LIST_INVOICES]: {
    required: [],
    requiredAnyOf: [],
    description: 'List all invoices with optional pagination and filters.'
  },
  [WORKFLOW_ACTIONS.LIST_PENDING_INVOICES]: {
    required: [],
    requiredAnyOf: [],
    description: 'List invoices that are pending payment.'
  },
  [WORKFLOW_ACTIONS.LIST_OVERDUE_INVOICES]: {
    required: [],
    requiredAnyOf: [],
    description: 'List invoices that are overdue.'
  },
  [WORKFLOW_ACTIONS.LIST_DRAFT_INVOICES]: {
    required: [],
    requiredAnyOf: [],
    description: 'List draft invoices.'
  },
  [WORKFLOW_ACTIONS.LIST_PAID_INVOICES]: {
    required: [],
    requiredAnyOf: [],
    description: 'List invoices that are fully paid.'
  },
  [WORKFLOW_ACTIONS.LIST_PARTIALLY_PAID_INVOICES]: {
    required: [],
    requiredAnyOf: [],
    description: 'List invoices with partial payments.'
  },
  [WORKFLOW_ACTIONS.GET_CLIENT_INVOICES]: {
    required: [],
    requiredAnyOf: [['clientName', 'clientEmail']],
    description: 'List invoices for a specific client.'
  },
  [WORKFLOW_ACTIONS.GET_PAYMENT_SUMMARY]: {
    required: [],
    requiredAnyOf: [],
    description: 'Get aggregated payment summary.'
  },
  [WORKFLOW_ACTIONS.GET_CLIENT_PAYMENT_SUMMARY]: {
    required: [],
    requiredAnyOf: [['clientName', 'clientEmail']],
    description: 'Get payment summary for a specific client.'
  },

  [WORKFLOW_ACTIONS.GET_INVOICE]: {
    required: [],
    requiredAnyOf: [],
    description: 'Retrieve invoices using optional filters.'
  },

  [WORKFLOW_ACTIONS.GET_INVOICE_STATUS]: {
    required: [],
    requiredAnyOf: [['invoiceId', 'invoiceNumber']],
    description: 'Retrieve the status of a specific invoice.'
  },

  [WORKFLOW_ACTIONS.GET_PAYMENT_HISTORY]: {
    required: [],
    requiredAnyOf: [],
    description: 'Retrieve payment history using optional filters.'
  },

  [WORKFLOW_ACTIONS.GET_OUTSTANDING_BALANCE]: {
    required: [],
    requiredAnyOf: [],
    description: 'Retrieve outstanding balances using optional filters.'
  },

  [WORKFLOW_ACTIONS.GET_DASHBOARD_SUMMARY]: {
    required: [],
    requiredAnyOf: [],
    description: 'Retrieve the business dashboard summary.'
  },

  [WORKFLOW_ACTIONS.CREATE_INVOICE_DRAFT]: {
    required: [],
    requiredAnyOf: [
      ['clientName', 'clientEmail'],
      ['items', 'lineItems', 'amount']
    ],
    description: 'Prepare an invoice draft for a specified client.'
  },

  [WORKFLOW_ACTIONS.PREPARE_PAYMENT_FOLLOWUP]: {
    required: [],
    requiredAnyOf: [
      ['invoiceId', 'invoiceNumber', 'clientName', 'clientEmail']
    ],
    description: 'Prepare a payment follow-up.'
  },

  [WORKFLOW_ACTIONS.PREPARE_CLIENT_MESSAGE]: {
    required: [],
    requiredAnyOf: [
      ['clientName', 'clientEmail'],
      ['message', 'purpose']
    ],
    description: 'Prepare a message for a specified client.'
  },

  [WORKFLOW_ACTIONS.SEND_INVOICE]: {
    required: [],
    requiredAnyOf: [['invoiceId', 'invoiceNumber']],
    description: 'Request sending an existing invoice.'
  },

  [WORKFLOW_ACTIONS.CANCEL_INVOICE]: {
    required: [],
    requiredAnyOf: [['invoiceId', 'invoiceNumber']],
    description: 'Request cancellation of an existing invoice.'
  }
});

export const getWorkflowRule = (action) =>
  WORKFLOW_RULES[action] ?? null;
