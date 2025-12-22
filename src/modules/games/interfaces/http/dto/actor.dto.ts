import { ApiProperty } from '@nestjs/swagger';
import type { ActorType } from '../../../domain/value-objects/actor-type.vo';
import { Actor } from '../../../domain/value-objects/actor.vo';

export class ActorDto {
  @ApiProperty({ description: 'Actor unique identifier', example: 'actor-001' })
  id: string;

  @ApiProperty({ description: 'Actor name', example: 'Goblin' })
  name: string;

  @ApiProperty({ description: 'Faction unique identifier', example: 'faction-001' })
  factionId: string;

  @ApiProperty({ description: 'Actor type', example: 'character' })
  type: ActorType;

  static fromEntity(entity: Actor): ActorDto {
    const dto = new ActorDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.factionId = entity.factionId;
    dto.type = entity.type;
    return dto;
  }
}
