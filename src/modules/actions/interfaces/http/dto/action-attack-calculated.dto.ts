import { ApiProperty } from '@nestjs/swagger';
import { ModifierDto } from '../../../../shared/interfaces/http/modifiers.dto';

export class ActionAttackCalculatedDto {
  @ApiProperty({ description: 'Total attack value after applying all modifiers' })
  rollModifiers: ModifierDto[];

  @ApiProperty({ description: 'Sum of all modifiers', example: 42 })
  rollTotal: number;

  static fromEntity(entity: ActionAttackCalculatedDto): ActionAttackCalculatedDto {
    const dto = new ActionAttackCalculatedDto();
    dto.rollModifiers = entity.rollModifiers ? entity.rollModifiers.map((mod) => ModifierDto.fromEntity(mod)) : [];
    dto.rollTotal = entity.rollTotal;
    return dto;
  }
}
