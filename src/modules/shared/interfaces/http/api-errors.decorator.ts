import { applyDecorators } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { ErrorDto } from './dto/error-dto';

type ErrorStatus = 400 | 401 | 403 | 404 | 409;

const UNAUTHORIZED = 'Invalid or missing authentication token';

/**
 * Documents the error responses of an authenticated endpoint, all with ErrorDto. 401 is always included:
 * `@ApiErrors({ 404: 'Race not found', 400: 'Bad request, invalid data' })`.
 */
export function ApiErrors(errors: Partial<Record<ErrorStatus, string>> = {}) {
  const all: Partial<Record<ErrorStatus, string>> = { 401: UNAUTHORIZED, ...errors };
  return applyDecorators(
    ...Object.entries(all).map(([status, description]) => ApiResponse({ status: Number(status), description, type: ErrorDto })),
  );
}
