
import { env } from '../config/env.js';

const LOG_LEVELS = Object.freeze({
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
});

const sensitiveKeyPattern =
  /(authorization|cookie|token|secret|api.?key|password|credential|signature)/i;

const currentLogLevel =
  env.NODE_ENV === 'production' ? 'info' : 'debug';

const redact = (value, seen = new WeakSet()) => {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message
    };
  }

  if (seen.has(value)) {
    return '[Circular]';
  }

  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => redact(item, seen));
  }

  const result = {};

  for (const [key, nestedValue] of Object.entries(value)) {
    result[key] = sensitiveKeyPattern.test(key)
      ? '[REDACTED]'
      : redact(nestedValue, seen);
  }

  return result;
};

const writeLog = (level, message, metadata = {}) => {
  if (LOG_LEVELS[level] < LOG_LEVELS[currentLogLevel]) {
    return;
  }

  const entry = {
    timestamp: new Date().toISOString(),
    level,
    service: 'bizpilot-ai-service',
    message,
    ...(metadata && Object.keys(metadata).length > 0
      ? { metadata: redact(metadata) }
      : {})
  };

  const output = JSON.stringify(entry);

  if (level === 'error') {
    console.error(output);
    return;
  }

  if (level === 'warn') {
    console.warn(output);
    return;
  }

  console.log(output);
};

export const logger = Object.freeze({
  debug(message, metadata = {}) {
    writeLog('debug', message, metadata);
  },

  info(message, metadata = {}) {
    writeLog('info', message, metadata);
  },

  warn(message, metadata = {}) {
    writeLog('warn', message, metadata);
  },

  error(message, metadata = {}) {
    writeLog('error', message, metadata);
  }
});
