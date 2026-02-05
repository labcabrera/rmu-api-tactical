import { ApiProperty } from '@nestjs/swagger';
import type { ActorType } from '../../../domain/value-objects/actor-type.vo';
import { Actor } from '../../../domain/value-objects/actor.vo';
import { ActorRoundFactionDto } from './actor-round-faction.dto';

export class ActorDto {
  constructor(id = '', name = '', faction = new ActorRoundFactionDto(), type: ActorType = 'character') {
    this.id = id;
    this.name = name;
    this.faction = faction;
    this.type = type;
  }

  @ApiProperty({ description: 'Actor unique identifier', example: 'actor-001' })
  id: string;

  @ApiProperty({ description: 'Actor name', example: 'Goblin' })
  name: string;

  @ApiProperty({ description: 'Actor faction' })
  faction: ActorRoundFactionDto;

  @ApiProperty({ description: 'Actor type', example: 'character' })
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
