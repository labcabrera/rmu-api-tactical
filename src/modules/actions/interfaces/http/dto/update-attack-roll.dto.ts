import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { UpdateAttackRollCommand } from '../../../application/cqrs/commands/update-attack-roll.command.js';

export class UpdateAttackRollDto {
  @ApiProperty({ description: 'Attack name', example: 'mainHand' })
  @IsString()
  @IsNotEmpty()
  attackName: string;

  @ApiProperty({ description: 'Total of the high open-ended d100', example: 15 })
  @IsNumber()
  roll: number;

  @ApiProperty({ description: 'First die, unmodified: it decides the fumble', example: 4, required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  unmodified?: number;

  @ApiProperty({
    description:
      'Every die of the open-ended roll, in order: a 33 or 77 calls for a breakage check. The chain is checked with the ' +
      'roll profile of the attacker (err-roll-open-ended-invalid), as its sum against roll and its first die against unmodified',
    example: [96, 33],
    required: false,
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(100, { each: true })
  rolls?: number[];

  @ApiProperty({
    description: 'Spasm (spec 076): rounds of the spasm of a natural 66 (d10); the API rolls them when left out',
    required: false,
    minimum: 1,
    maximum: 10,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  spasmRounds?: number;

  @ApiProperty({
    description:
      'Spec 077: the unmodified critical roll (1-100), rolled with the attack. Required against a target with armour by ' +
      'location (defense.at null) without a called shot (err-attack-location-roll-required), ignored on a fumble: its ' +
      'location decides the armour type of the attack, and the criticals of the attack are rolled with it',
    required: false,
    minimum: 1,
    maximum: 100,
    example: 81,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  criticalRoll?: number;

  static toCommand(actionId: string, dto: UpdateAttackRollDto, userId: string, roles: string[]) {
    return new UpdateAttackRollCommand(
      actionId,
      dto.attackName,
      dto.roll,
      userId,
      roles,
      dto.unmodified,
      dto.rolls,
      dto.spasmRounds,
      dto.criticalRoll,
    );
  }
}
