import { Actor } from '../../../domain/entities/actor.vo';
import { ActorType } from '../../../domain/entities/game.aggregate';

export class ActorDto {
  id: string;
  name: string;
  factionId: string;
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
