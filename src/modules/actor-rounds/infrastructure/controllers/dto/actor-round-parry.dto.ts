import { ActorRoundParry } from '../../../domain/entities/actor-round.entity';

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
