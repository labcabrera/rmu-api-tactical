import { ApiProperty } from '@nestjs/swagger';
import { AttackRange } from '../../../domain/value-objets/actor-round-attack.vo';

export class AttackRangeDto {
  @ApiProperty({ description: 'Range start', example: 10 })
  from: number;

  @ApiProperty({ description: 'Range end', example: 30 })
  to: number;

  @ApiProperty({ description: 'Bonus for this range', example: 5 })
  bonus: number;

  static fromEntity(range: AttackRange): AttackRangeDto {
    const dto = new AttackRangeDto();
    dto.from = range.from;
    dto.to = range.to;
    dto.bonus = range.bonus;
    return dto;
  }
}
