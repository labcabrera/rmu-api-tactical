import { ApiProperty } from '@nestjs/swagger';

export class RollDto {
  @ApiProperty({ description: 'Roll', example: 42 })
  roll: number;
}
