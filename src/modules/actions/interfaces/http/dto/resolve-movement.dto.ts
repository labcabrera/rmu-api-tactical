import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { ResolveMovementCommand } from '../../../application/cqrs/commands/resolve-movement.command.js';
import { ActionMovementModifiersDto } from './action-movement.dto.js';
import { ActionRollDto } from './action-roll.dto.js';

export class ResolveMovementRequestDto {
  @ApiProperty({ description: 'Movement completion phase', example: 2 })
  @IsObject()
  @ValidateNested()
  @Type(() => ActionMovementModifiersDto)
  modifiers: ActionMovementModifiersDto;

  @IsOptional()
  @IsObject()
  roll: ActionRollDto | null;

  @IsOptional()
  @IsString()
  description: string | null;

  @ApiProperty({ required: false, description: 'Spec 068: resolve despite the warnings that need a confirmation (409 lists them)' })
  @IsOptional()
  @IsBoolean()
  confirm?: boolean;

  static toCommand(actionId: string, dto: ResolveMovementRequestDto, userId: string, roles: string[]): ResolveMovementCommand {
    return new ResolveMovementCommand(
      actionId,
      ActionMovementModifiersDto.toEntity(dto.modifiers),
      dto.roll?.roll ?? null,
      dto.description,
      userId,
      roles,
      dto.confirm === true,
    );
  }
}
