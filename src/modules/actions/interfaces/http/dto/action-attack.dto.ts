import { ApiProperty } from '@nestjs/swagger';
import { ActionAttack } from '../../../domain/value-objects/action-attack.vo.js';
import type { AttackStatus } from '../../../domain/value-objects/attack-status.vo.js';
import { ActionAttackCalculatedDto } from './action-attack-calculated.dto.js';
import { ActionAttackModifiersDto } from './action-attack-modifiers.dto.js';
import { ActionAttackResultsDto } from './action-attack-results.dto.js';
import { ActionAttackRollDto } from './action-attack-roll.dto.js';

export class ActionAttackDto {
  @ApiProperty({ description: 'Name of the attack', example: 'mainHand' })
  public attackName: string;

  @ApiProperty({ description: 'Attack type', example: 'melee' })
  public type: string;

  @ApiProperty({ description: 'Modifiers for the attack' })
  public modifiers: ActionAttackModifiersDto;

  @ApiProperty({ description: 'The attack roll' })
  public roll: ActionAttackRollDto | undefined;

  @ApiProperty({ description: 'Calculated attack values' })
  public calculated: ActionAttackCalculatedDto | undefined;

  @ApiProperty({ description: 'Attack results' })
  public results: ActionAttackResultsDto | undefined;

  @ApiProperty({
    type: String,
    description: 'What the attack is waiting for',
    enum: ['pending_attack_roll', 'pending_critical_roll', 'pending_fumble_roll', 'pending_apply', 'completed'],
    example: 'pending_attack_roll',
  })
  public status: AttackStatus;

  static fromEntity(entity: ActionAttack): ActionAttackDto {
    const dto = new ActionAttackDto();
    dto.attackName = entity.attackName;
    dto.type = entity.type;
    dto.modifiers = ActionAttackModifiersDto.fromEntity(entity.modifiers);
    dto.status = entity.status;
    dto.roll = entity.roll ? ActionAttackRollDto.fromEntity(entity.roll) : undefined;
    dto.results = entity.results ? ActionAttackResultsDto.fromEntity(entity.results) : undefined;
    dto.calculated = entity.calculated ? ActionAttackCalculatedDto.fromEntity(entity.calculated) : undefined;
    return dto;
  }
}
