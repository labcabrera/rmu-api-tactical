import { ApiProperty } from '@nestjs/swagger';
import { ActionAttack } from '../../../domain/entities/action-attack.vo';
import type { ActionStatus } from '../../../domain/entities/action-status.vo';
import { ActionAttackModifiersDto } from './action-attack-modifiers.dto';

export class ActionAttackDto {
  @ApiProperty({ description: 'Attack type', example: 'mainHand' })
  public modifiers: ActionAttackModifiersDto;
  public externalAttackId: string | undefined;
  public status: ActionStatus;

  static fromEntity(entity: ActionAttack): ActionAttackDto {
    const dto = new ActionAttackDto();
    dto.modifiers = ActionAttackModifiersDto.fromEntity(entity.modifiers);
    dto.externalAttackId = entity.externalAttackId;
    dto.status = entity.status;
    return dto;
  }
}
