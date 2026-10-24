import { ApiProperty } from '@nestjs/swagger';
import { HP_LOG_KINDS } from '../../../domain/value-objects/hp-log-entry.vo';
import type { HpBySource, HpLogEntry, HpLogKind } from '../../../domain/value-objects/hp-log-entry.vo';

/** A change of the hits of an actor round (spec 013, §1.1). */
export class HpLogEntryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  round: number;

  @ApiProperty({ required: false, description: '0 before the action phases, 1-4 in them, 5 in the upkeep' })
  phase?: number;

  @ApiProperty({ description: 'Hits applied: negative is damage, positive healing' })
  amount: number;

  @ApiProperty({ type: String, enum: HP_LOG_KINDS })
  kind: HpLogKind;

  @ApiProperty({ required: false })
  actionId?: string;

  @ApiProperty({ required: false })
  attackerId?: string;

  @ApiProperty({ required: false })
  attackerName?: string;

  @ApiProperty({ required: false, description: 'The injury that bleeds or is treated' })
  injuryId?: string;

  @ApiProperty({ required: false, example: 'S-C-91' })
  criticalKey?: string;

  @ApiProperty()
  at: string;

  static fromEntity(entity: HpLogEntry): HpLogEntryDto {
    return Object.assign(new HpLogEntryDto(), entity);
  }
}

export class HpByAttackerDto {
  @ApiProperty()
  attackerId: string;

  @ApiProperty({ required: false })
  attackerName?: string;

  @ApiProperty({ description: 'Sum of the hits (negative is damage)' })
  amount: number;
}

/** Totals of a hits log by kind and by attacker (spec 013, §1.1). */
export class HpBySourceDto {
  @ApiProperty({ type: 'object', additionalProperties: { type: 'number' }, description: 'Sum of the hits by kind (only the kinds logged)' })
  byKind: Partial<Record<HpLogKind, number>>;

  @ApiProperty({ type: [HpByAttackerDto] })
  byAttacker: HpByAttackerDto[];

  static fromEntity(entity: HpBySource): HpBySourceDto {
    return Object.assign(new HpBySourceDto(), {
      byKind: { ...entity.byKind },
      byAttacker: entity.byAttacker.map(each => Object.assign(new HpByAttackerDto(), each)),
    });
  }
}
