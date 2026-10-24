export class DomainError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 500,
    public readonly errorCode: string = 'undefined_error',
    /** Extra data for the client, such as the actors an error refers to. */
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'DomainError';
    this.errorCode = errorCode;
  }
}
export class NotFoundError extends DomainError {
  constructor(entity: string, id: number | string, errorCode: string = 'not_found') {
    super(`${entity} ${id} not found`, 404, errorCode);
    this.name = 'NotFoundError';
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

export class UnprocessableEntityError extends DomainError {
  public readonly status: number = 422;

  constructor(message: string, errorCode: string = 'undefined_error', details?: unknown) {
    super(message, 422, errorCode, details);
    this.name = 'UnprocessableEntityError';
    Object.setPrototypeOf(this, UnprocessableEntityError.prototype);
  }
}

export class NotModifiedError extends DomainError {
  public readonly status: number = 304;

  constructor(message: string) {
    super(message, 304);
    this.name = 'NotModifiedError';
    Object.setPrototypeOf(this, NotModifiedError.prototype);
  }
}

export class ConflictError extends DomainError {
  public readonly status: number = 409;

  constructor(message: string, errorCode: string = 'undefined_error', details?: unknown) {
    super(message, 409, errorCode, details);
    this.name = 'ConflictError';
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

export class ValidationError extends DomainError {
  public readonly status: number = 400;

  constructor(message: string, errorCode: string = 'validation_error', details?: unknown) {
    super(message, 400, errorCode, details);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export class InvalidSearchExpression extends DomainError {
  public readonly status: number = 400;

  constructor(message: string) {
    super(message, 400);
    this.name = 'InvalidSearchExpression';
    Object.setPrototypeOf(this, InvalidSearchExpression.prototype);
  }
}

export class BadGatewayError extends DomainError {
  constructor(message: string, errorCode: string = 'bad_gateway') {
    super(message, 502, errorCode);
    this.name = 'BadGatewayError';
    Object.setPrototypeOf(this, BadGatewayError.prototype);
  }
}
