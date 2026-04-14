import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsString, ValidateNested } from 'class-validator';

export class ActorRoundPenaltyModifierDto {
  constructor(id: string, source: string, value: number) {
    this.id = id;
    this.source = source;
    this.value = value;
  }

  @IsString()
  id: string;

  @IsString()
  source: string;

  @IsNumber()
  value: number;
}

export class ActorRoundPenaltyDto {
  constructor(modifiers: ActorRoundPenaltyModifierDto[]) {
    this.modifiers = modifiers;
  }

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ActorRoundPenaltyModifierDto)
  modifiers: ActorRoundPenaltyModifierDto[];

  static fromEntity(penalty: ActorRoundPenaltyDto): ActorRoundPenaltyDto {
    return new ActorRoundPenaltyDto(penalty.modifiers.map(m => new ActorRoundPenaltyModifierDto(m.id, m.source, m.value)));
  }
}
