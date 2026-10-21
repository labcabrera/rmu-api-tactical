import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayUnique, IsArray, IsIn, IsString, ValidateNested } from 'class-validator';
import type { CharacterCondition } from '../../../../actor-rounds/domain/value-objets/injury.vo';
import { InjuryDto } from '../../../../actor-rounds/interfaces/http/dto/actor-round-injury.dto';
import { HpBySourceDto, HpLogEntryDto } from '../../../../actor-rounds/interfaces/http/dto/hp-log-entry.dto';
import { ActorFate, AtRiskActor, CHARACTER_FATES } from '../../../domain/value-objects/tactical-game-outcome.vo';
import type {
  CharacterFate,
  TacticalGameOutcome,
  TacticalGameOutcomeCharacter,
} from '../../../domain/value-objects/tactical-game-outcome.vo';

export class OutcomeHpDto {
  @ApiProperty()
  start: number;

  @ApiProperty()
  end: number;

  @ApiProperty({ description: 'end - start' })
  delta: number;
}

export class TacticalGameOutcomeCharacterDto {
  @ApiProperty()
  actorId: string;

  @ApiProperty()
  characterId: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ type: OutcomeHpDto })
  hp: OutcomeHpDto;

  @ApiProperty({ type: [HpLogEntryDto], description: 'Every change of the hits in the game, by round' })
  hpLog: HpLogEntryDto[];

  @ApiProperty({ type: HpBySourceDto, description: 'Totals of the hits log by kind and by attacker' })
  hpBySource: HpBySourceDto;

  @ApiProperty({ type: [InjuryDto], description: 'Final state of every injury of the actor' })
  injuries: InjuryDto[];

  @ApiProperty({ type: [String] })
  injuriesAdded: string[];

  @ApiProperty({ type: [String] })
  injuriesUpdated: string[];

  @ApiProperty({ type: [String] })
  injuriesHealed: string[];

  @ApiProperty({ type: [Object], description: 'Dead, unconscious or permanently unconscious at the end' })
  conditions: CharacterCondition[];

  @ApiProperty({ type: [String], description: 'Conditions it brought that ended in the game' })
  conditionsResolved: string[];

  @ApiProperty({ enum: CHARACTER_FATES, required: false })
  fate?: CharacterFate;

  @ApiProperty({ required: false })
  appliedAt?: string;

  @ApiProperty({ required: false, description: 'Error of the last attempt to apply it' })
  error?: string;

  static fromEntity(entity: TacticalGameOutcomeCharacter): TacticalGameOutcomeCharacterDto {
    return Object.assign(new TacticalGameOutcomeCharacterDto(), entity, {
      hp: Object.assign(new OutcomeHpDto(), entity.hp),
      hpLog: (entity.hpLog || []).map(entry => HpLogEntryDto.fromEntity(entry)),
      hpBySource: HpBySourceDto.fromEntity(entity.hpBySource ?? { byKind: {}, byAttacker: [] }),
      injuries: (entity.injuries || []).map(injury => InjuryDto.fromEntity(injury)),
      conditionsResolved: entity.conditionsResolved || [],
    });
  }
}

export class TacticalGameOutcomeDto {
  @ApiProperty()
  finishedAt: string;

  @ApiProperty({ required: false, description: 'When every character was applied to the strategic model' })
  appliedAt?: string;

  @ApiProperty({ type: [TacticalGameOutcomeCharacterDto] })
  characters: TacticalGameOutcomeCharacterDto[];

  static fromEntity(entity: TacticalGameOutcome): TacticalGameOutcomeDto {
    const dto = new TacticalGameOutcomeDto();
    dto.finishedAt = entity.finishedAt;
    dto.appliedAt = entity.appliedAt;
    dto.characters = (entity.characters || []).map(character => TacticalGameOutcomeCharacterDto.fromEntity(character));
    return dto;
  }
}

export class AtRiskActorDto {
  @ApiProperty()
  actorId: string;

  @ApiProperty()
  characterId: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ description: 'Hits per round of its injuries' })
  bleeding: number;

  @ApiProperty({ required: false, description: 'Rounds left of its dying effect' })
  dyingRounds?: number;

  static fromEntity(entity: AtRiskActor): AtRiskActorDto {
    return Object.assign(new AtRiskActorDto(), entity);
  }
}

/** `GET /v1/tactical-games/:id/finish-preview`: the data of the finish dialog. */
export class FinishPreviewDto {
  @ApiProperty()
  gameId: string;

  @ApiProperty({ type: [TacticalGameOutcomeCharacterDto], description: 'The outcome the game would finish with (no fates)' })
  characters: TacticalGameOutcomeCharacterDto[];

  @ApiProperty({ type: [AtRiskActorDto], description: 'Characters that need a fate' })
  atRisk: AtRiskActorDto[];
}

export class ActorFateDto implements ActorFate {
  @ApiProperty()
  @IsString()
  actorId: string;

  @ApiProperty({ enum: CHARACTER_FATES })
  @IsIn(CHARACTER_FATES)
  fate: CharacterFate;
}

export class FinishGameDto {
  @ApiProperty({ type: [ActorFateDto], description: 'Fate of each character at risk (bleeding or dying)' })
  @IsArray()
  @ArrayUnique((fate: ActorFateDto) => fate.actorId)
  @ValidateNested({ each: true })
  @Type(() => ActorFateDto)
  fates: ActorFateDto[] = [];
}
