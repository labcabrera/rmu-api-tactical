import { ApiProperty } from '@nestjs/swagger';

export class SimpleRollDto {
  @ApiProperty({ description: 'Roll', example: 42 })
  roll: number;
}
