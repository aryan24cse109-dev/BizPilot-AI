
import { invoiceItemSchema } from '../../../schemas/assistant.schema.js';

const isPlainObject = (value) =>
  value !== null &&
  typeof value === 'object' &&
  !Array.isArray(value);

const normalizeString = (value) => {
  if (typeof value !== 'string') return value;

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

export const validateInvoiceItems = (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('Invoice items must be a non-empty array.');
  }

  for (const item of items) {
    const validation = invoiceItemSchema.safeParse(item);
    if (!validation.success) {
      throw new Error('Invoice item data is invalid.');
    }
  }
};

const normalizeValue = (value) => {
  if (typeof value === 'string') {
    return normalizeString(value);
  }

  if (Array.isArray(value)) {
    return value.map(normalizeValue);
  }

  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [
        key,
        normalizeValue(nestedValue)
      ])
    );
  }

  return value;
};

export const normalizeWorkflowParameters = ({
  parameters = {},
  entities = {}
} = {}) => {
  const safeParameters = isPlainObject(parameters) ? parameters : {};
  const safeEntities = isPlainObject(entities) ? entities : {};

  const normalizedEntities = Object.fromEntries(
    Object.entries(safeEntities).map(([key, value]) => [
      key,
      normalizeValue(value)
    ])
  );

  const normalizedParameters = Object.fromEntries(
    Object.entries(safeParameters).map(([key, value]) => [
      key,
      normalizeValue(value)
    ])
  );

  const mergedParameters = {
    ...normalizedEntities,
    ...normalizedParameters
  };

  if (
    mergedParameters.items !== undefined &&
    mergedParameters.lineItems !== undefined &&
    JSON.stringify(mergedParameters.items) !==
      JSON.stringify(mergedParameters.lineItems)
  ) {
    throw new Error('Invoice items and lineItems conflict.');
  }

  const itemValues = mergedParameters.items ??
    mergedParameters.lineItems;

  if (itemValues !== undefined) {
    if (!Array.isArray(itemValues) || itemValues.length === 0) {
      throw new Error('Invoice items must be a non-empty array.');
    }

    mergedParameters.items = itemValues;
    delete mergedParameters.lineItems;
  }

  // Entity values provide defaults.
  // Explicit workflow parameters take precedence.
  return mergedParameters;
};

export const hasMeaningfulValue = (value) => {
  if (value === null || value === undefined) return false;

  if (typeof value === 'string') {
    return value.trim().length > 0;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value);
  }

  if (typeof value === 'boolean') {
    return true;
  }

  if (isPlainObject(value)) {
    return Object.keys(value).length > 0;
  }

  return false;
};
