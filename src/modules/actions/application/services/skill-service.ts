import { Inject, Injectable } from '@nestjs/common';
import { ActorRound } from '../../../actor-rounds/domain/aggregates/actor-round.aggregate';
import { NotFoundError } from '../../../shared/domain/errors';
import type { CharacterPort } from '../../../strategic/application/ports/character.port';

@Injectable()
export class SkillService {
  constructor(@Inject('CharacterClient') private readonly characterClient: CharacterPort) {}

  async getSkillBonus(actorRound: ActorRound, skillId: string, specialization: string | null): Promise<number> {
    const character = await this.characterClient.findById(actorRound.actorId);
    if (!character) throw new NotFoundError('Character', actorRound.actorId);
    const skill = character.skills.find(
      s => (s.skillId === skillId && s.specialization === specialization) || (s.skillId === skillId && !s.specialization),
    );
    return skill ? skill.totalBonus : -20;
  }
}
