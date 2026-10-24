import { ApiProperty } from '@nestjs/swagger';
import type { ApLedgerKind } from '../../../domain/value-objets/ap-ledger-entry.vo';
import { ApLedgerEntry } from '../../../domain/value-objets/ap-ledger-entry.vo';

export class ActorRoundApLedgerEntryDto {
  @ApiProperty({ description: 'Action phase (1-4)', example: 2 })
  phase: number;

  @ApiProperty({ description: 'Action the AP went to (missing in entries rebuilt from older data)', required: false })
  actionId?: string;

  @ApiProperty({ description: 'Action points', example: 1 })
  ap: number;

  @ApiProperty({
    type: String,
    description: 'Spent on an action, lost, or an instantaneous action',
    enum: ['spent', 'lost', 'instant'],
    example: 'spent',
  })
  kind: ApLedgerKind;

  static fromEntity(entity: ApLedgerEntry): ActorRoundApLedgerEntryDto {
    const dto = new ActorRoundApLedgerEntryDto();
    dto.phase = entity.phase;
    dto.actionId = entity.actionId;
    dto.ap = entity.ap;
    dto.kind = entity.kind;
    return dto;
  }
}
