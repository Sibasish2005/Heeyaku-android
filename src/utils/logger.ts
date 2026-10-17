/**
 * Client Logger Abstraction.
 * Ensures zero technical information disclosure (no service names,
 * no server state, no endpoints, no credentials, no internal errors).
 */

const SENSITIVE_PATTERNS = [
  /clerk/i,
  /token/i,
  /jwt/i,
  /key/i,
  /secret/i,
  /password/i,
  /bearer/i,
  /http:\/\//i,
  /https:\/\//i,
  /prisma/i,
  /postgres/i,
  /status\s*[:=]\s*\d{3}/i,
  /500|502|503|504|400|401|403|404|429/,
];

function sanitize(msg: unknown): string {
  if (typeof msg !== 'string') {
    return '[Protected Data]';
  }
  for (const pattern of SENSITIVE_PATTERNS) {
    if (pattern.test(msg)) {
      return '[Sanitized Notice] Request processed.';
    }
  }
  return msg;
}

export const logger = {
  log: (...args: unknown[]) => {
    if (__DEV__) {
      const sanitized = args.map(sanitize);
      console.log(...sanitized);
    }
  },
  warn: (...args: unknown[]) => {
    if (__DEV__) {
      const sanitized = args.map(sanitize);
      console.warn(...sanitized);
    }
  },
  error: (...args: unknown[]) => {
    if (__DEV__) {
      const sanitized = args.map(sanitize);
      console.error(...sanitized);
    }
  },
};
