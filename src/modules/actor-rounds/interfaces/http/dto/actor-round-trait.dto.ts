import { ApiProperty } from '@nestjs/swagger';
import { ActorRoundTrait } from '../../../domain/value-objects/actor-round-trait.vo';

export class ActorRoundTraitDto {
  @ApiProperty({ description: 'Trait identifier', example: 'foiler' })
  traitId: string;

  @ApiProperty({ description: 'Tier (1 for traits without tiers)', example: 1 })
  tier: number;

  @ApiProperty({
    type: String,
    description: 'Skill, weapon type or other value the trait was taken for',
    required: false,
    example: 'blade',
  })
  specialization: string | null;

  static fromEntity(entity: ActorRoundTrait): ActorRoundTraitDto {
    const dto = new ActorRoundTraitDto();
    dto.traitId = entity.traitId;
    dto.tier = entity.tier;
    dto.specialization = entity.specialization ?? null;
    return dto;
  }
}
