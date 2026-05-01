import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsString, ValidateNested } from 'class-validator';
import { ActorRoundPenaltyModifier } from '../../../domain/value-objets/actor-round-penalty-modifier.vo';
import { ActorRoundPenalty } from '../../../domain/value-objets/actor-round-penalty.vo';

export class ActorRoundPenaltyModifierDto {
  @IsString()
  id: string;

  @IsString()
  source: string;

  @IsNumber()
  value: number;

  static fromEntity(entity: ActorRoundPenaltyModifier): ActorRoundPenaltyModifierDto {
    const dto = new ActorRoundPenaltyModifierDto();
    dto.id = entity.id;
    dto.source = entity.source;
    dto.value = entity.value;
    return dto;
  }
}

export class ActorRoundPenaltyDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ActorRoundPenaltyModifierDto)
  modifiers: ActorRoundPenaltyModifierDto[];

  static fromEntity(entity: ActorRoundPenalty): ActorRoundPenaltyDto {
    const dto = new ActorRoundPenaltyDto();
    dto.modifiers = entity.modifiers.map(m => ActorRoundPenaltyModifierDto.fromEntity(m));
    return dto;
  }
}
