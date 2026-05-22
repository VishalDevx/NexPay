export enum ErrorCode {
  AUTHENTICATION_ERROR = 'authentication_error',
  PAYMENT_ERROR = 'payment_error',
  VALIDATION_ERROR = 'validation_error',
  RATE_LIMIT_ERROR = 'rate_limit_error',
  API_ERROR = 'api_error',
}

export class NexPayError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(message: string, code: ErrorCode, statusCode: number, details?: unknown) {
    super(message);
    this.name = 'NexPayError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export class NexPayAuthenticationError extends NexPayError {
  constructor(message: string = 'Authentication failed', details?: unknown) {
    super(message, ErrorCode.AUTHENTICATION_ERROR, 401, details);
    this.name = 'NexPayAuthenticationError';
  }
}

export class NexPayPaymentError extends NexPayError {
  constructor(message: string = 'Payment error', details?: unknown) {
    super(message, ErrorCode.PAYMENT_ERROR, 402, details);
    this.name = 'NexPayPaymentError';
  }
}

export class NexPayValidationError extends NexPayError {
  constructor(message: string = 'Validation error', details?: unknown) {
    super(message, ErrorCode.VALIDATION_ERROR, 422, details);
    this.name = 'NexPayValidationError';
  }
}

export class NexPayRateLimitError extends NexPayError {
  constructor(message: string = 'Rate limit exceeded', details?: unknown) {
    super(message, ErrorCode.RATE_LIMIT_ERROR, 429, details);
    this.name = 'NexPayRateLimitError';
  }
}

export class NexPayApiError extends NexPayError {
  constructor(message: string = 'API error', statusCode: number = 500, details?: unknown) {
    super(message, ErrorCode.API_ERROR, statusCode, details);
    this.name = 'NexPayApiError';
  }
}
