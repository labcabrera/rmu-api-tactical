import { ApiProperty } from '@nestjs/swagger';
import { ActorRoundFaction } from '../../../domain/value-objets/actor-round-faction.vo';

export class ActorRoundFactionDto {
  @ApiProperty({ description: 'Faction id', example: 'faction-123' })
  id: string;

  @ApiProperty({ description: 'Faction name', example: 'Red Faction' })
  name: string;

  static fromEntity(entity: ActorRoundFaction): ActorRoundFactionDto {
    const dto = new ActorRoundFactionDto();
    dto.id = entity.id;
    dto.name = entity.name;
    return dto;
  }
}
