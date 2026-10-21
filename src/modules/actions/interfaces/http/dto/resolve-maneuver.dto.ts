import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { ManeuverRoll, ResolveManeuverCommand, ResolveManeuverRequest } from '../../../application/cqrs/commands/resolve-maneuver.commands';
import type { Difficulty } from '../../../domain/value-objects/dificulty.vo';
import type { LightType } from '../../../domain/value-objects/light-type.vo';
import type { LightManeuverModifier } from '../../../domain/value-objects/ligth-maneuver-modifier.vo';
import type { ManeuverModifierSelection } from '../../../domain/value-objects/maneuver-profile.vo';
import type { ManeuverType } from '../../../domain/value-objects/maneuver-type.vo';

export class ManeuverRollDto {
  @ApiProperty({ description: 'Total of the open-ended roll', example: 87 })
  @IsNumber()
  roll: number;

  @ApiProperty({ description: 'First die, unmodified (66 is an unusual event)', example: 66, required: false })
  @IsOptional()
  @IsNumber()
  unmodified?: number;
}

/** @deprecated Body of the resolve request before spec 010. Read for one more version. */
export class LegacyResolveManeuverModifiersDto {
  @ApiProperty({ description: 'The difficulty of the maneuver', example: 'h', required: false })
  difficulty?: Difficulty;

  @ApiProperty({ description: 'How the maneuver uses light', example: 'helpful', required: false })
  lightModifier?: LightManeuverModifier;

  @ApiProperty({ description: 'The type of light', example: 'dark', required: false })
  light?: LightType;

  @ApiProperty({ description: 'Ignored: the armor penalty comes from the character sheet', required: false })
  armorModifier?: boolean;

  @ApiProperty({ description: 'Custom bonus to apply to the maneuver roll', example: 10, required: false })
  customBonus?: number;
}

export class ResolveManeuverDto {
  @ApiProperty({ description: 'Skill to roll with, when it changes from the declared one', required: false })
  @IsOptional()
  @IsString()
  skillId?: string;

  @ApiProperty({ description: 'Specialization of the skill', required: false })
  @IsOptional()
  @IsString()
  specialization?: string;

  @ApiProperty({ description: 'Maneuver type, when it changes from the declared one', enum: ['absolute', 'percent'], required: false })
  @IsOptional()
  @IsIn(['absolute', 'percent'])
  maneuverType?: ManeuverType;

  @ApiProperty({ description: 'Difficulty (Table 5-1)', example: 'm', required: false })
  @IsOptional()
  @IsString()
  difficulty?: Difficulty;

  @ApiProperty({ description: 'Light of the environment, when the skill uses light', example: 'dark', required: false })
  @IsOptional()
  @IsString()
  light?: LightType;

  @ApiProperty({
    description: 'Choices for the skill catalog modifiers by key: option key (choice), boolean (flag) or units (number)',
    example: { 'animal-domestication': 'domesticated' },
    required: false,
  })
  @IsOptional()
  @IsObject()
  selections?: Record<string, ManeuverModifierSelection>;

  @ApiProperty({ description: 'Custom bonus of the game master', example: 10, required: false })
  @IsOptional()
  @IsNumber()
  customBonus?: number;

  @ApiProperty({ description: 'Conflicting maneuver: total of the passive side', example: 134, required: false })
  @IsOptional()
  @IsNumber()
  passiveTotal?: number;

  @ApiProperty({ description: 'Roll', type: ManeuverRollDto })
  @ValidateNested()
  @Type(() => ManeuverRollDto)
  @IsObject()
  roll: ManeuverRollDto;

  @ApiProperty({ description: 'Deprecated body of the modifiers', type: LegacyResolveManeuverModifiersDto, required: false })
  @IsOptional()
  @IsObject()
  modifiers?: LegacyResolveManeuverModifiersDto;

  static toCommand(actionId: string, dto: ResolveManeuverDto, userId: string, roles: string[]): ResolveManeuverCommand {
    return new ResolveManeuverCommand(
      actionId,
      ResolveManeuverDto.toRequest(dto),
      new ManeuverRoll(dto.roll?.roll, dto.roll?.unmodified),
      userId,
      roles,
    );
  }

  /** The new fields win; the legacy `modifiers` fills the ones left out. */
  private static toRequest(dto: ResolveManeuverDto): ResolveManeuverRequest {
    const legacy = dto.modifiers ?? {};
    return new ResolveManeuverRequest(
      dto.difficulty ?? legacy.difficulty,
      dto.selections ?? {},
      dto.light ?? legacy.light,
      dto.customBonus ?? legacy.customBonus,
      dto.passiveTotal,
      dto.skillId,
      dto.specialization,
      dto.maneuverType,
      legacy.lightModifier,
    );
  }
}
