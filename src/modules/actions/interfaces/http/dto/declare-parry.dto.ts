import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ValidateNested } from 'class-validator';
import { DeclareParryCommand } from '../../../application/cqrs/commands/declare-parry.command';

export class DeclareParryItemDto {
  @ApiProperty({ description: 'Identifier of the actor declaring the parry or protecting', example: 'actor-round-123' })
  public parryActorId: string;
  @ApiProperty({ description: 'Value of the parry', example: 5 })
  public parry: number;
}
export class DeclareParryDto {
  @ApiProperty({ description: 'List of parries', type: [DeclareParryItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  public parries: DeclareParryItemDto[];

  static toCommand(actionId: string, dto: DeclareParryDto, userId: string, roles: string[]) {
    return new DeclareParryCommand(actionId, dto.parries, userId, roles);
  }
}
