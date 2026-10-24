import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNumber, IsOptional, IsString } from 'class-validator';
import { KeyValueModifierDto } from '../../../../shared/interfaces/http/dto/key-value-modifier.dto.js';
import { ResolveEnduranceCheckCommand } from '../../../application/cqrs/commands/resolve-endurance-check.command.js';

export class ResolveEnduranceCheckDto {
  constructor(roll: number, alertId: string | undefined, modifiers: KeyValueModifierDto[]) {
    this.roll = roll;
    this.alertId = alertId;
    this.modifiers = modifiers;
  }

  @ApiProperty({
    description: 'Identifier of the alert to resolve',
    example: 'a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6',
    required: false,
  })
  @IsString()
  @IsOptional()
  alertId?: string;

  @ApiProperty({ description: 'Endurance roll (open-ended d100)', required: true, example: 42 })
  @IsNumber()
  roll: number;

  @ApiProperty({ description: 'Modifiers applied to the roll', type: [KeyValueModifierDto], required: false })
  @IsOptional()
  @IsArray()
  modifiers: KeyValueModifierDto[];

  static toCommand(actorRoundId: string, dto: ResolveEnduranceCheckDto, userId: string, roles: string[]): ResolveEnduranceCheckCommand {
    return new ResolveEnduranceCheckCommand(actorRoundId, dto.alertId, dto.roll, dto.modifiers || [], userId, roles);
  }
}
