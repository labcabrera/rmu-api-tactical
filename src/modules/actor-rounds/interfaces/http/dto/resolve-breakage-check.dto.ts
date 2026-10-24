import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { ResolveBreakageCheckCommand } from '../../../application/cqrs/commands/resolve-breakage-check.command';
import type { BreakageCheckResult } from '../../../domain/aggregates/actor-round';

export class BreakageModifierDto {
  @ApiProperty({ example: 'gm' })
  @IsString()
  @IsNotEmpty()
  key: string;

  @ApiProperty({ example: -10 })
  @IsNumber()
  value: number;
}

export class ResolveBreakageCheckDto {
  @ApiProperty({ description: 'Item of the actor to check (`items[].itemId` of the actor round)', example: 'item-001' })
  @IsString()
  @IsNotEmpty()
  itemId: string;

  @ApiProperty({ description: 'Breakage roll (open-ended d100)', example: 42 })
  @IsNumber()
  roll: number;

  @ApiProperty({ description: 'First roll of the open-ended one, when it is not `roll` (an unmodified 66)', required: false })
  @IsNumber()
  @IsOptional()
  unmodifiedRoll?: number;

  @ApiProperty({ description: 'Breakage alert the check resolves', required: false })
  @IsString()
  @IsOptional()
  alertId?: string;

  @ApiProperty({ description: 'Strength of the item, when it has none or the game master changes it', required: false, example: 80 })
  @IsNumber()
  @IsOptional()
  strength?: number;

  @ApiProperty({ description: 'Other modifiers of the game master', type: [BreakageModifierDto], required: false })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BreakageModifierDto)
  @IsOptional()
  modifiers?: BreakageModifierDto[];

  static toCommand(actorRoundId: string, dto: ResolveBreakageCheckDto, userId: string, roles: string[]): ResolveBreakageCheckCommand {
    return new ResolveBreakageCheckCommand(
      actorRoundId,
      dto.itemId,
      dto.roll,
      dto.unmodifiedRoll,
      dto.alertId,
      dto.strength,
      (dto.modifiers || []).map(modifier => ({ key: modifier.key, value: modifier.value })),
      userId,
      roles,
    );
  }
}

export class BreakageCheckResultDto {
  @ApiProperty()
  itemId: string;

  @ApiProperty()
  roll: number;

  @ApiProperty()
  unmodified66: boolean;

  @ApiProperty()
  total: number;

  @ApiProperty({ type: [BreakageModifierDto] })
  breakdown: BreakageModifierDto[];

  @ApiProperty({ enum: ['absolute-failure', 'failure', 'partial-success', 'success', 'absolute-success'] })
  result: string;

  @ApiProperty({ description: 'Damage (or repair) added to the item', required: false, type: Object })
  modifier?: BreakageCheckResult['modifier'];

  static fromEntity(entity: BreakageCheckResult): BreakageCheckResultDto {
    const dto = new BreakageCheckResultDto();
    Object.assign(dto, { ...entity, breakdown: entity.breakdown.map(modifier => ({ ...modifier })) });
    return dto;
  }
}
