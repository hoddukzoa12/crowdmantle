/**
 * Domain Errors - Domain Layer
 * Custom error types for domain operations
 */

export class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'DomainError';
    Object.setPrototypeOf(this, DomainError.prototype);
  }
}

export class InvalidAddressError extends DomainError {
  constructor(address: string) {
    super(`Invalid address: ${address}`, 'INVALID_ADDRESS', { address });
    this.name = 'InvalidAddressError';
  }
}

export class InsufficientFundsError extends DomainError {
  constructor(required: string, available: string) {
    super(
      `Insufficient funds. Required: ${required}, Available: ${available}`,
      'INSUFFICIENT_FUNDS',
      { required, available }
    );
    this.name = 'InsufficientFundsError';
  }
}

export class InvestmentLimitExceededError extends DomainError {
  constructor(limit: string, attempted: string) {
    super(
      `Investment limit exceeded. Limit: ${limit}, Attempted: ${attempted}`,
      'INVESTMENT_LIMIT_EXCEEDED',
      { limit, attempted }
    );
    this.name = 'InvestmentLimitExceededError';
  }
}

export class ProjectNotFoundError extends DomainError {
  constructor(projectId: string) {
    super(`Project not found: ${projectId}`, 'PROJECT_NOT_FOUND', { projectId });
    this.name = 'ProjectNotFoundError';
  }
}

export class UnauthorizedError extends DomainError {
  constructor(action: string, reason?: string) {
    super(
      `Unauthorized to ${action}${reason ? `: ${reason}` : ''}`,
      'UNAUTHORIZED',
      { action, reason }
    );
    this.name = 'UnauthorizedError';
  }
}

export class ProjectNotInvestableError extends DomainError {
  constructor(projectId: string, reason: string) {
    super(
      `Cannot invest in project ${projectId}: ${reason}`,
      'PROJECT_NOT_INVESTABLE',
      { projectId, reason }
    );
    this.name = 'ProjectNotInvestableError';
  }
}

export class TransactionFailedError extends DomainError {
  constructor(transactionType: string, reason?: string) {
    super(
      `Transaction failed: ${transactionType}${reason ? ` - ${reason}` : ''}`,
      'TRANSACTION_FAILED',
      { transactionType, reason }
    );
    this.name = 'TransactionFailedError';
  }
}

export class ValidationError extends DomainError {
  constructor(field: string, message: string) {
    super(`Validation failed for ${field}: ${message}`, 'VALIDATION_ERROR', {
      field,
      message,
    });
    this.name = 'ValidationError';
  }
}
