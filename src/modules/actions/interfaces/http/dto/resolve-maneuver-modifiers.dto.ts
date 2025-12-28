import { ApiProperty } from '@nestjs/swagger';
import { ResolveManeuverModifiers } from '../../../application/cqrs/commands/resolve-maneuver.commands';
import { LightType } from '../../../domain/value-objects/light-type.vo';
import { LightManeuverModifier } from '../../../domain/value-objects/ligth-maneuver-modifier.vo';
import { ManeuverDifficulty } from '../../../domain/value-objects/maneuver-dificulty.vo';

export class ResolveManeuverModifiersDto {
  @ApiProperty({ description: 'The difficulty of the maneuver', example: 'easy' })
  difficulty?: ManeuverDifficulty | undefined;

  @ApiProperty({ description: 'Indicates the light maneuver modifier', example: 'helpful' })
  lightModifier?: LightManeuverModifier | undefined;

  @ApiProperty({ description: 'The type of light', example: 'dark' })
  light?: LightType | undefined;

  @ApiProperty({ description: 'Indicates if the armor modifier applies', example: true })
  armorModifier?: boolean | undefined;

  @ApiProperty({ description: 'Custom bonus to apply to the maneuver roll', example: 10 })
  customBonus?: number | undefined;

  static toCommand(dto: ResolveManeuverModifiersDto): ResolveManeuverModifiers {
    return new ResolveManeuverModifiers(
      dto.difficulty,
      dto.lightModifier,
      dto.light,
      dto.armorModifier,
      dto.customBonus,
    );
  }
}
