import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ValidateNested } from 'class-validator';
import { PrepareAttackCommand } from '../../../application/cqrs/commands/prepare-attack.command';
import { PrepareAttackItemDto } from './prepare-attack-item.dto';

export class PrepareAttackDto {
  @ApiProperty({ description: 'List of attacks to prepare', type: [PrepareAttackItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  attacks: PrepareAttackItemDto[];

  static toCommand(actionId: string, dto: PrepareAttackDto, userId: string, roles: string[]): PrepareAttackCommand {
    return new PrepareAttackCommand(
      actionId,
      dto.attacks.map((attack) => PrepareAttackItemDto.toCommandItem(attack)),
      userId,
      roles,
    );
  }
}
