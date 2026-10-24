import { ApiProperty } from '@nestjs/swagger';
import type { ActorType } from '../../../domain/value-objects/actor-type.vo.js';
import { Actor } from '../../../domain/value-objects/actor.vo.js';
import { ActorRoundFactionDto } from './actor-round-faction.dto.js';

export class ActorDto {
  @ApiProperty({ description: 'Actor unique identifier', example: 'actor-001' })
  id: string;

  @ApiProperty({ description: 'Actor name', example: 'Goblin' })
  name: string;

  @ApiProperty({ description: 'Actor faction' })
  faction: ActorRoundFactionDto;

  @ApiProperty({ type: String, description: 'Actor type', example: 'character' })
  type: ActorType;

  static fromEntity(entity: Actor): ActorDto {
    const dto = new ActorDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.faction = ActorRoundFactionDto.fromEntity(entity.faction);
    dto.type = entity.type;
    return dto;
  }
}
