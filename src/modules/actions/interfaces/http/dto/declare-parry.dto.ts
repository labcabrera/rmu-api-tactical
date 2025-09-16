import { ApiProperty } from '@nestjs/swagger';
import { IsObject } from 'class-validator';
import { DeclareParryCommand } from '../../../application/cqrs/commands/declare-parry.command';

export class DeclareParryDto {
  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'number' },
    example: { parry01: 20, parry02: 15 },
  })
  @IsObject()
  public parries: Record<string, number>;

  static toCommand(actionId: string, dto: DeclareParryDto, userId: string, roles: string[]) {
    const map = new Map<string, number>(Object.entries(dto.parries));
    return new DeclareParryCommand(actionId, map, userId, roles);
  }
}
