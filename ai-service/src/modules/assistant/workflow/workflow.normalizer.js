
const isPlainObject = (value) =>
  value !== null &&
  typeof value === 'object' &&
  !Array.isArray(value);

const normalizeString = (value) => {
  if (typeof value !== 'string') return value;

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
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

  // Entity values provide defaults.
  // Explicit workflow parameters take precedence.
  return {
    ...normalizedEntities,
    ...normalizedParameters
  };
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
