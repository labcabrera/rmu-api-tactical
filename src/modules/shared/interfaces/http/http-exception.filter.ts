import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import { DomainError } from '../../domain/errors/errors.js';
import type { ErrorDto } from './dto/error-dto.js';

type ErrorBody = Pick<ErrorDto, 'statusCode' | 'error' | 'code' | 'message' | 'details'>;

/** The code of a Nest HTTP exception, from its status. */
const HTTP_CODES: Record<number, string> = {
  400: 'bad-request',
  401: 'unauthorized',
  403: 'forbidden',
  404: 'not-found',
  409: 'conflict',
  413: 'payload-too-large',
  429: 'too-many-requests',
};

/**
 * One error format for every HTTP failure: domain errors, Nest exceptions (validation, 401 from the guard...),
 * duplicate keys in Mongo (409) and anything unexpected (500, without its details).
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    // Bodies that are not errors of ours, like the health report of a failed /v1/health, go out untouched.
    if (
      exception instanceof HttpException &&
      typeof exception.getResponse() === 'object' &&
      !('message' in (exception.getResponse() as object))
    ) {
      this.logger.warn(`${request.method} ${request.originalUrl}: ${exception.getStatus()}`);
      ctx.getResponse<Response>().status(exception.getStatus()).json(exception.getResponse());
      return;
    }
    const body = toErrorBody(exception);
    const where = `${request.method} ${request.originalUrl}`;
    if (body.statusCode >= 500) {
      this.logger.error(`${where}: ${body.statusCode}`, exception instanceof Error ? exception.stack : String(exception));
    } else {
      this.logger.warn(`${where}: ${body.statusCode} ${body.error} ${JSON.stringify(body.message)}`);
    }
    ctx
      .getResponse<Response>()
      .status(body.statusCode)
      // The path without the query string (spec 021, F-receta-22).
      .json({ ...body, timestamp: new Date().toISOString(), path: request.path } satisfies ErrorDto);
  }
}

function toErrorBody(exception: unknown): ErrorBody {
  if (exception instanceof DomainError) {
    return {
      statusCode: exception.statusCode,
      error: exception.name,
      code: exception.code,
      message: exception.message,
      ...(exception.details !== undefined ? { details: exception.details } : {}),
    };
  }
  if (exception instanceof HttpException) {
    const response = exception.getResponse();
    const fields = typeof response === 'object' ? (response as { message?: unknown }) : {};
    const message = Array.isArray(fields.message) || typeof fields.message === 'string' ? fields.message : exception.message;
    // The class name, like domain errors: BadRequestException, UnauthorizedException...
    const statusCode = exception.getStatus();
    return { statusCode, error: exception.name, code: HTTP_CODES[statusCode] ?? 'http-error', message: message as string | string[] };
  }
  if (isDuplicateKey(exception)) {
    return {
      statusCode: HttpStatus.CONFLICT,
      error: 'ConflictError',
      code: 'duplicate-key',
      message: `Duplicate key ${JSON.stringify(exception.keyValue)}`,
    };
  }
  return {
    statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    error: 'InternalServerError',
    code: 'internal-error',
    message: 'Internal server error',
  };
}

function isDuplicateKey(exception: unknown): exception is { keyValue?: unknown } {
  return exception instanceof Error && exception.name === 'MongoServerError' && (exception as unknown as { code?: number }).code === 11000;
}
