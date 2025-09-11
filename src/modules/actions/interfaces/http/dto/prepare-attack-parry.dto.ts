import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { PrepareAttackCommandParryItem } from '../../../application/cqrs/commands/prepare-attack.command';

export class PrepareAttackParryDto {
  @ApiProperty({
    description: 'Actor round identifier who is targeted by the attack or protecting agains it',
    example: 'actor-round-protector-002',
  })
  @IsString()
  @IsNotEmpty()
  public parryActorId: string;

  @ApiProperty({ description: 'Actor round identifier who is the target of the attack', example: 'actor-round-target-001' })
  @IsString()
  @IsNotEmpty()
  public targetId: string;

  static toCommandItem(dto: PrepareAttackParryDto): PrepareAttackCommandParryItem {
    return new PrepareAttackCommandParryItem(dto.parryActorId, dto.targetId);
  }
}
