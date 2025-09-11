import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ValidateNested } from 'class-validator';
import { PrepareAttackCommand, PrepareAttackCommandParryItem } from '../../../application/cqrs/commands/prepare-attack.command';
import { PrepareAttackItemDto } from './prepare-attack-item.dto';
import { PrepareAttackParryDto } from './prepare-attack-parry.dto';

export class PrepareAttackDto {
  @ApiProperty({ description: 'List of attacks to prepare', type: [PrepareAttackItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  attacks: PrepareAttackItemDto[];

  @ApiProperty({ description: 'List of parries to prepare', type: [PrepareAttackParryDto] })
  @IsArray()
  @ValidateNested({ each: true })
  parries: PrepareAttackParryDto[];

  static toCommand(actionId: string, dto: PrepareAttackDto, userId: string, roles: string[]): PrepareAttackCommand {
    return new PrepareAttackCommand(
      actionId,
      dto.attacks.map((attack) => PrepareAttackItemDto.toCommandItem(attack)),
      dto.parries.map((parry) => new PrepareAttackCommandParryItem(parry.parryActorId, parry.targetId)),
      userId,
      roles,
    );
  }
}
