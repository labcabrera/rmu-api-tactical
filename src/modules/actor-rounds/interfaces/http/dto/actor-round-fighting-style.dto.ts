import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { DeclareFightingStyleCommand } from '../../../application/cqrs/commands/declare-fighting-style.command.js';
import {
  type ActiveStyleAbility,
  type ActorRoundActiveStyle,
  type ActorRoundFightingStyle,
  FIGHTING_STYLE_SKILLS,
  OPTIONAL_STYLE_ABILITIES,
} from '../../../domain/value-objects/actor-round-fighting-style.vo.js';

export class ActorRoundStyleAbilityDto {
  @ApiProperty({ example: 'lightning-reflexes' })
  abilityId: string;

  @ApiProperty({ description: 'Times selected', example: 1 })
  times: number;
}

export class ActorRoundFightingStyleDto {
  @ApiProperty({ enum: FIGHTING_STYLE_SKILLS, example: 'combat-styles' })
  skillId: string;

  @ApiProperty({ description: 'Specialization of the style skill', example: 'fencing' })
  styleId: string;

  @ApiProperty({ example: 4 })
  ranks: number;

  @ApiProperty({ description: 'Ranks not allocated to abilities', example: 2 })
  freeRanks: number;

  @ApiProperty({ type: [ActorRoundStyleAbilityDto] })
  abilities: ActorRoundStyleAbilityDto[];

  static fromEntity(entity: ActorRoundFightingStyle): ActorRoundFightingStyleDto {
    return Object.assign(new ActorRoundFightingStyleDto(), {
      skillId: entity.skillId,
      styleId: entity.styleId,
      ranks: entity.ranks,
      freeRanks: entity.freeRanks,
      abilities: entity.abilities.map(ability => ({ abilityId: ability.abilityId, times: ability.times })),
    });
  }
}

export class ActiveStyleAbilityDto extends ActorRoundStyleAbilityDto {
  @ApiProperty({ description: 'The equipment it needs is there' })
  met: boolean;

  @ApiProperty({ type: [String], nullable: true, description: 'Attacks it works with; null when any' })
  attackNames: string[] | null;
}

export class ActorRoundActiveStyleDto {
  @ApiProperty({ enum: FIGHTING_STYLE_SKILLS, example: 'combat-styles' })
  skillId: string;

  @ApiProperty({ example: 'fencing' })
  styleId: string;

  @ApiProperty({ description: 'The equipment of the style is there: otherwise it gives nothing' })
  met: boolean;

  @ApiProperty({ type: [String], nullable: true, description: 'Attacks the style works with; null when any' })
  attackNames: string[] | null;

  @ApiProperty({ description: 'OB of the free ranks (+2 each, at most +10)', example: 4 })
  freeRanksBonus: number;

  @ApiProperty({ type: [ActiveStyleAbilityDto] })
  abilities: ActiveStyleAbilityDto[];

  @ApiProperty({ type: [String], description: 'Requirements the game cannot check (mounted, leadership...)', example: ['mounted'] })
  warnings: string[];

  @ApiProperty({ type: [String], enum: OPTIONAL_STYLE_ABILITIES, description: 'Optional abilities used this round' })
  options: string[];

  static fromEntity(entity: ActorRoundActiveStyle): ActorRoundActiveStyleDto {
    return Object.assign(new ActorRoundActiveStyleDto(), {
      skillId: entity.skillId,
      styleId: entity.styleId,
      met: entity.met,
      attackNames: entity.attackNames ? [...entity.attackNames] : null,
      freeRanksBonus: entity.freeRanksBonus,
      abilities: entity.abilities.map((ability: ActiveStyleAbility) => ({
        abilityId: ability.abilityId,
        times: ability.times,
        met: ability.met,
        attackNames: ability.attackNames ? [...ability.attackNames] : null,
      })),
      warnings: [...entity.warnings],
      options: [...entity.options],
    });
  }
}

export class DeclareFightingStyleDto {
  @ApiProperty({ enum: FIGHTING_STYLE_SKILLS, required: false, nullable: true, description: 'Style skill; none to fight without style' })
  @IsOptional()
  @IsIn(FIGHTING_STYLE_SKILLS)
  skillId?: string | null;

  @ApiProperty({ required: false, nullable: true, example: 'fencing' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  styleId?: string | null;

  @ApiProperty({ type: [String], enum: OPTIONAL_STYLE_ABILITIES, required: false, description: 'Optional abilities used this round' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsIn(OPTIONAL_STYLE_ABILITIES, { each: true })
  options?: string[];

  static toCommand(id: string, dto: DeclareFightingStyleDto, userId: string, roles: string[]): DeclareFightingStyleCommand {
    return new DeclareFightingStyleCommand(id, dto.skillId || null, dto.styleId || null, dto.options || [], userId, roles);
  }
}
