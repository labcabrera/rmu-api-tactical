import { ApiProperty } from '@nestjs/swagger';

export class ErrorDto {
  @ApiProperty({ description: 'Error code', example: 'SomeError' })
  error: string;

  @ApiProperty({ description: 'Error key for the client (i18n)', example: 'err-game-finished', required: false })
  errorCode?: string;

  @ApiProperty({ description: 'Error message', example: 'Some error description' })
  message: string;

  @ApiProperty({ description: 'Extra data, such as the actors at risk of err-finish-fate-required', required: false, type: Object })
  details?: unknown;

  @ApiProperty({ description: 'Timestamp', example: '2023-01-01T00:00:00Z' })
  timestamp: Date;
}
