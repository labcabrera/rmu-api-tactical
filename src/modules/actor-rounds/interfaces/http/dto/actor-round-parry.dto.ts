import { ActorRoundParry } from '../../../infrastructure/persistence/models/actor-round-childs.model.js';

export class ActorRoundParryDto {
  attackName: string;
  parryValue: number;

  static fromEntity(entity: ActorRoundParry): ActorRoundParryDto {
    const dto = new ActorRoundParryDto();
    dto.attackName = entity.attackName;
    dto.parryValue = entity.parryValue;
    return dto;
  }
}
