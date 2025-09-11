import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsNumber, IsString, ValidateNested } from 'class-validator';
import { DeclareParryCommand } from '../../../application/cqrs/commands/declare-parry.command';

export class DeclareParryItemDto {
  @ApiProperty({ description: 'Identifier of the actor declaring the parry or protecting', example: 'actor-round-002' })
  @IsString()
  @IsNotEmpty()
  public parryActorId: string;

  @ApiProperty({ description: 'Target of the attack', example: 'actor-round-003' })
  @IsString()
  @IsNotEmpty()
  public targetId: string;

  @ApiProperty({ description: 'Value of the parry', example: 5 })
  @IsNumber()
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
