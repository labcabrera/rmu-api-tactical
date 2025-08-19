import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';
import { DomainError } from '../../domain/errors';

//TODO map errors
@Catch(DomainError)
export class DomainExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainExceptionFilter.name);

  catch(exception: DomainError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    this.logger.error('error', JSON.stringify(exception, null, 2));
    const status = exception.statusCode || HttpStatus.BAD_REQUEST;

    response.status(status).json({
      error: exception.name,
      message: exception.message,
      timestamp: new Date().toISOString(),
    });
  }
}
