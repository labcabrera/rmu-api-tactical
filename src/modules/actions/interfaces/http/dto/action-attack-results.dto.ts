import { ApiProperty } from '@nestjs/swagger';
import { ActionAttackResult } from '../../../domain/value-objects/action-attack.vo';
import { CriticalDto } from './critical-dto';

export class AttackTableEntryDto {
  @ApiProperty({ description: 'Attack table entry text', example: '12AS' })
  text: string;

  @ApiProperty({ description: 'Damage value', example: 5 })
  damage: number;

  @ApiProperty({ description: 'Critical type', example: 'S' })
  criticalType: string | undefined;

  @ApiProperty({ description: 'Critical severity', example: 'A' })
  criticalSeverity: string | undefined;
}

export class ActionAttackResultsDto {
  @ApiProperty({ description: 'Attack table entry', type: AttackTableEntryDto, required: false })
  attackTableEntry: AttackTableEntryDto | undefined;

  @ApiProperty({ description: 'List of criticals', type: [CriticalDto], required: false })
  criticals: CriticalDto[] | undefined;

  static fromEntity(entity: ActionAttackResult): ActionAttackResultsDto {
    const dto = new ActionAttackResultsDto();
    dto.attackTableEntry = entity.attackTableEntry
      ? {
          text: entity.attackTableEntry.text,
          damage: entity.attackTableEntry.damage,
          criticalType: entity.attackTableEntry.criticalType,
          criticalSeverity: entity.attackTableEntry.criticalSeverity,
        }
      : undefined;
    dto.criticals = entity.criticals ? entity.criticals.map((critical) => CriticalDto.fromEntity(critical)) : undefined;
    return dto;
  }
}
