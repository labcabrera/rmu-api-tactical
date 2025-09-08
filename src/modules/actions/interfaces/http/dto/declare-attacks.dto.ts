import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';

export class DeclareAttacksDto {
  @ApiProperty({ description: 'Attack' })
  @IsArray()
  attacks: PrepareAttackItemDto[];
}

export class PrepareAttackItemDto {
  @ApiProperty({ description: 'Attack name obtained from character attacks' })
  @IsString()
  attackName: string;

  @ApiProperty({ description: 'Target actor identifier' })
  @IsString()
  targetId: string;
}
