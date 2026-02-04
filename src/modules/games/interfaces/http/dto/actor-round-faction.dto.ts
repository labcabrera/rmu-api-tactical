import { ApiProperty } from '@nestjs/swagger';
import { ActorRoundFaction } from '../../../../actor-rounds/domain/value-objets/actor-round-faction.vo';

export class ActorRoundFactionDto {
  @ApiProperty({ description: 'Faction identifier', example: 'faction-001' })
  id: string;

  @ApiProperty({ description: 'Faction name', example: 'Goblins' })
  name: string;

  static fromEntity(entity: ActorRoundFaction): ActorRoundFactionDto {
    const dto = new ActorRoundFactionDto();
    dto.id = entity.id;
    dto.name = entity.name;
    return dto;
  }
}
