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

  @ApiProperty({ description: 'User who acts for the actor: the owner of its character or faction, or the game master', example: 'user-1' })
  owner: string;

  @ApiProperty({ type: String, description: 'NPC an NPC actor is a specimen of (spec 055)', required: false, example: 'npc-wolf' })
  npcId?: string;

  static fromEntity(entity: Actor): ActorDto {
    const dto = new ActorDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.faction = ActorRoundFactionDto.fromEntity(entity.faction);
    dto.type = entity.type;
    dto.owner = entity.owner;
    if (entity.npcId) dto.npcId = entity.npcId;
    return dto;
  }
}
