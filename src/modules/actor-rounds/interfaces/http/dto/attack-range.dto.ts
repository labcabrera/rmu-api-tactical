import { ApiProperty } from '@nestjs/swagger';
import { AttackRange } from '../../../domain/value-objects/actor-round-attack.vo.js';

export class AttackRangeDto {
  @ApiProperty({ description: 'Range start', example: 10 })
  from: number;

  @ApiProperty({ description: 'Range end', example: 30 })
  to: number;

  @ApiProperty({ description: 'Bonus for this range', example: 5 })
  bonus: number;

  @ApiProperty({ description: 'Part of the bonus given by Deadeye (spec 079, D1)', example: 10, required: false })
  traitBonus?: number;

  static fromEntity(range: AttackRange): AttackRangeDto {
    const dto = new AttackRangeDto();
    dto.from = range.from;
    dto.to = range.to;
    dto.bonus = range.bonus;
    if (range.traitBonus) dto.traitBonus = range.traitBonus;
    return dto;
  }
}
