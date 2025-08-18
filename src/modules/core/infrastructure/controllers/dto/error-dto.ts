import { ApiProperty } from '@nestjs/swagger';

export class ErrorDto {
  @ApiProperty({ description: 'Error code', example: 'SomeError' })
  error: string;

  @ApiProperty({ description: 'Error message', example: 'Some error description' })
  message: string;

  @ApiProperty({ description: 'Timestamp', example: '2023-01-01T00:00:00Z' })
  timestamp: Date;
}
