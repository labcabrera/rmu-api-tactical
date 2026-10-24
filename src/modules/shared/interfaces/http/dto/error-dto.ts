import { ApiProperty } from '@nestjs/swagger';

export class ErrorDto {
  @ApiProperty({ description: 'HTTP status code', example: 404 })
  statusCode: number;

  @ApiProperty({ description: 'Error class', example: 'NotFoundError' })
  error: string;

  @ApiProperty({
    description:
      'Stable error code for clients: not-found, forbidden, validation, bad-request, conflict, version-conflict, duplicate-key, and the rule keys err-...',
    example: 'not-found',
  })
  code: string;

  @ApiProperty({
    description: 'Same as code, kept for the clients that read it before spec 020 (rmu-mfe-tactical); deprecated',
    example: 'err-game-finished',
    deprecated: true,
  })
  errorCode: string;

  @ApiProperty({
    description: 'Error message; a list of messages for request validation errors',
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
    example: 'Race 1 not found',
  })
  message: string | string[];

  @ApiProperty({ description: 'Extra data, such as the actors at risk of err-finish-fate-required', required: false, type: Object })
  details?: unknown;

  @ApiProperty({ description: 'Timestamp', example: '2023-01-01T00:00:00Z' })
  timestamp: string;

  @ApiProperty({ description: 'Request path', example: '/v1/races/1' })
  path: string;
}
