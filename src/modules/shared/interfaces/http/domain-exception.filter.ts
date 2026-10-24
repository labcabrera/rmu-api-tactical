import { type ArgumentsHost, Catch, type ExceptionFilter, HttpStatus, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { DomainError } from '../../domain/errors/errors.js';

//TODO map errors
@Catch(DomainError)
export class DomainExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainExceptionFilter.name);

  catch(exception: DomainError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    this.logger.error(`Caught error: ${exception.statusCode} ${exception.message}`);
    const status = exception.statusCode || HttpStatus.BAD_REQUEST;

    response.status(status).json({
      error: exception.name,
      errorCode: exception.errorCode,
      message: exception.message,
      ...(exception.details !== undefined ? { details: exception.details } : {}),
      timestamp: new Date().toISOString(),
    });
  }
}
