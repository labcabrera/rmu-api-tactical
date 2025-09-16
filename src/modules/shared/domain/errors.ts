export class DomainError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 500,
    public readonly errorCode: string = 'undefined_error',
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

  constructor(message: string) {
    super(message, 422);
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

  constructor(message: string) {
    super(message, 409);
    this.name = 'ConflictError';
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

export class ValidationError extends DomainError {
  public readonly status: number = 400;

  constructor(message: string, errorCode: string = 'validation_error') {
    super(message, 400, errorCode);
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
  constructor(message: string) {
    super(message, 502);
    this.name = 'BadGatewayError';
    Object.setPrototypeOf(this, BadGatewayError.prototype);
  }
}
