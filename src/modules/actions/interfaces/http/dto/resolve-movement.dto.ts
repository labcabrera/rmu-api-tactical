import { ApiProperty } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString } from 'class-validator';
import { ResolveMovementCommand } from '../../../application/cqrs/commands/resolve-movement.command';
import { ActionMovementModifiersDto } from './action-movement.dto';
import { ActionRollDto } from './action-roll.dto';

export class ResolveMovementRequestDto {
  @ApiProperty({ description: 'Movement completion phase', example: 2 })
  @IsObject()
  modifiers: ActionMovementModifiersDto;

  @IsOptional()
  @IsObject()
  roll: ActionRollDto | null;

  @IsOptional()
  @IsString()
  description: string | null;

  static toCommand(actionId: string, dto: ResolveMovementRequestDto, userId: string, roles: string[]): ResolveMovementCommand {
    return new ResolveMovementCommand(
      actionId,
      ActionMovementModifiersDto.toEntity(dto.modifiers),
      dto.roll?.roll || null,
      dto.description,
      userId,
      roles,
    );
  }
}
