import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { CRITICAL_STYLE_OPTIONS } from '../../../domain/services/style-critical-option.js';
import { UpdateCriticalRollCommand } from '../../../application/cqrs/commands/update-critical-roll.command.js';

export class UpdateCriticalRollDto {
  @ApiProperty({ description: 'Attack name', example: 'mainHand' })
  @IsString()
  @IsNotEmpty()
  attackName: string;

  @ApiProperty({ description: 'Critical key', example: 's_b_1' })
  @IsString()
  @IsNotEmpty()
  criticalKey: string;

  @ApiProperty({ description: 'Attack roll value', example: 15 })
  @IsNumber()
  roll: number;

  @ApiProperty({
    description: 'Fighting style ability decided before rolling the critical (workspace spec 032)',
    required: false,
    enum: CRITICAL_STYLE_OPTIONS,
  })
  @IsOptional()
  @IsIn(CRITICAL_STYLE_OPTIONS)
  styleOption?: string;

  @ApiProperty({
    description:
      'Roll again a critical already rolled with a critical-reroll effect (Sense Weakness, Study Offense; spec 076): the ' +
      'new roll counts, the first one is kept as originalRoll and the effect is used up',
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  reroll?: boolean;

  @ApiProperty({
    description: 'The die of the closed d100 roll (spec 076): when sent, it must be the roll (err-roll-open-ended-invalid)',
    required: false,
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsInt({ each: true })
  dice?: number[];

  static toCommand(actionId: string, dto: UpdateCriticalRollDto, userId: string, roles: string[]): UpdateCriticalRollCommand {
    return new UpdateCriticalRollCommand(
      actionId,
      dto.attackName,
      dto.criticalKey,
      dto.roll,
      userId,
      roles,
      dto.styleOption,
      dto.reroll === true,
      dto.dice,
    );
  }
}
