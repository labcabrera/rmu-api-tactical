import { ApiProperty } from '@nestjs/swagger';
import { ActionAttackResult } from '../../../domain/value-objects/action-attack.vo.js';
import { CriticalDto } from './critical.dto.js';

export class AttackTableEntryDto {
  @ApiProperty({ description: 'Attack table entry text', example: '12AS' })
  text: string;

  @ApiProperty({ description: 'Damage value', example: 5 })
  damage: number;

  @ApiProperty({ type: String, description: 'Critical type', example: 'S' })
  criticalType: string | undefined;

  @ApiProperty({ type: String, description: 'Critical severity', example: 'A' })
  criticalSeverity: string | undefined;
}

/** Workspace spec 079, A7: the table result a subdual attack changed (§9.7). */
export class SubdualAdjustmentDto {
  @ApiProperty({ description: 'Hits before halving', example: 12 })
  baseDamage: number;

  @ApiProperty({ type: String, nullable: true, description: 'Critical type of the table', example: 'S' })
  criticalType: string | null;

  @ApiProperty({ type: String, nullable: true, description: 'Critical severity of the table, before the cap at E', example: 'F' })
  criticalSeverity: string | null;
}

export class DamageAdjustmentDto {
  @ApiProperty({ description: 'Damage of the attack table before the Hit Multiplier', example: 10 })
  baseDamage: number;

  @ApiProperty({ description: 'Hit Multiplier of the attack size (Table 9-4a)', example: 1.5 })
  multiplier: number;
}

export class SeverityAdjustmentStepDto {
  @ApiProperty({
    description: 'What moves the severity',
    enum: [
      'attack-size',
      'adrenal-strength',
      'charge',
      'fighting-style',
      'target-size',
      'light-boned',
      'critical-code',
      'fall-control',
      'elemental-talent',
    ],
    example: 'attack-size',
  })
  key: string;

  @ApiProperty({ description: 'Severity steps (positive: more severe)', example: 1 })
  value: number;
}

export class SeverityAdjustmentDto {
  @ApiProperty({ description: 'Critical severity of the attack table', example: 'C' })
  original: string;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Critical severity after the steps; null when no critical is rolled',
    example: 'D',
  })
  final: string | null;

  @ApiProperty({ type: [SeverityAdjustmentStepDto], description: 'Non-zero steps, in order' })
  steps: SeverityAdjustmentStepDto[];
}

export class ActionAttackResultsDto {
  @ApiProperty({ description: 'Attack table entry', type: AttackTableEntryDto, required: false })
  attackTableEntry: AttackTableEntryDto | undefined;

  @ApiProperty({ description: 'List of criticals', type: [CriticalDto], required: false })
  criticals: CriticalDto[] | undefined;

  @ApiProperty({
    description: 'Fumble: `{status, text, additionalDamageText, damage, effects}`, status `pending_roll` until the fumble roll',
    required: false,
  })
  fumble:
    | {
        status: string;
        text: string | undefined;
        additionalDamageText: string | undefined;
        damage: number | undefined;
        effects:
          | {
              status: string;
              rounds: number | undefined;
              value: number | undefined;
              delay: number | undefined;
              condition: string | undefined;
              severity?: string;
              dice?: string;
            }[]
          | undefined;
      }
    | undefined;

  @ApiProperty({
    type: DamageAdjustmentDto,
    required: false,
    description: 'Spec 075: present when the attack size scaled the damage; `attackTableEntry.damage` is the scaled one',
  })
  damageAdjustment?: DamageAdjustmentDto;

  @ApiProperty({
    type: SeverityAdjustmentDto,
    required: false,
    description: 'Spec 075: present when some size step moved the critical severity (§9.4, T-3.1d, T-3.1e)',
  })
  severityAdjustment?: SeverityAdjustmentDto;

  @ApiProperty({
    type: SubdualAdjustmentDto,
    required: false,
    description: 'Spec 079: present on a subdual attack; the hits and critical of the table before halving and the subdual type',
  })
  subdualAdjustment?: SubdualAdjustmentDto;

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
    dto.criticals = entity.criticals ? entity.criticals.map(critical => CriticalDto.fromEntity(critical)) : undefined;
    dto.fumble = entity.fumble
      ? {
          status: entity.fumble.status,
          text: entity.fumble.text,
          additionalDamageText: entity.fumble.additionalDamageText,
          damage: entity.fumble.damage,
          effects: entity.fumble.effects
            ? entity.fumble.effects.map(e => ({
                status: e.status,
                rounds: e.rounds,
                value: e.value,
                delay: e.delay,
                condition: e.condition,
                severity: e.severity,
                dice: e.dice,
              }))
            : undefined,
        }
      : undefined;
    dto.damageAdjustment = entity.damageAdjustment
      ? { baseDamage: entity.damageAdjustment.baseDamage, multiplier: entity.damageAdjustment.multiplier }
      : undefined;
    dto.severityAdjustment = entity.severityAdjustment
      ? {
          original: entity.severityAdjustment.original,
          final: entity.severityAdjustment.final ?? null,
          steps: (entity.severityAdjustment.steps || []).map(step => ({ key: step.key, value: step.value })),
        }
      : undefined;
    dto.subdualAdjustment = entity.subdualAdjustment ? { ...entity.subdualAdjustment } : undefined;
    return dto;
  }
}
