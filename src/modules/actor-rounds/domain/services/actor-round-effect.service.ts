import { Injectable } from '@nestjs/common';
import { NotModifiedError } from '../../../shared/domain/errors';
import { ActorRound, ActorRoundEffect } from '../entities/actor-round.entity';

@Injectable()
export class ActorRoundEffectService {
  addEffect(actorRound: ActorRound, effect: ActorRoundEffect): void {
    const existing = actorRound.effects.filter((e) => e.status === effect.status);
    const isUnique = this.isUnique(effect.status);
    if (isUnique && existing.length > 0) {
      throw new NotModifiedError(`Effect with status ${effect.status} already exists`);
    }
    actorRound.effects.push(effect);
  }

  private isUnique(status: string): boolean {
    switch (status) {
      case 'death':
        return true;
    }
    return false;
  }
}
