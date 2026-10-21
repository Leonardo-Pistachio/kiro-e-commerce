/**
 * An expected, user-facing failure. The API turns it into
 * `{ "error": { "code", "message", "details" } }` with `status`.
 */
export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const badRequest = (message: string, details?: unknown) => new AppError(400, 'VALIDATION_FAILED', message, details);
export const unauthorized = (message = 'Please log in to continue.') => new AppError(401, 'UNAUTHORIZED', message);
export const notFound = (message: string) => new AppError(404, 'NOT_FOUND', message);
export const conflict = (code: string, message: string, details?: unknown) => new AppError(409, code, message, details);
