import { Inject, Injectable, NotImplementedException } from '@nestjs/common';
import { Actor } from '../../../games/domain/entities/actor.vo';
import { ValidationError } from '../../../shared/domain/errors';
import * as cc from '../../../strategic/application/ports/out/character-client';
import { Character } from '../../../strategic/application/ports/out/character-client';
import { ActorRound, ActorRoundAttack } from '../../domain/entities/actor-round.entity';
import * as crr from '../ports/out/character-round.repository';

@Injectable()
export class ActorRoundService {
  constructor(
    @Inject('ActorRoundRepository') private readonly actorRoundRepository: crr.ActorRoundRepository,
    @Inject('CharacterClient') private readonly characterClient: cc.CharacterClient,
  ) {}

  public async create(gameId: string, actor: Actor, round: number): Promise<void> {
    if (round === 1) {
      return await this.createFromTemplate(gameId, actor, round);
    }
    // character could be added in a later round
    const prev = await this.actorRoundRepository.findByActorIdAndRound(actor.id, round - 1);
    if (prev) {
      return await this.createFromPreviousRound(prev);
    }
    return await this.createFromTemplate(gameId, actor, round);
  }

  public async createFromPreviousRound(prev): Promise<void> {
    const template: Partial<ActorRound> = {
      ...prev,
      id: undefined,
      updatedAt: undefined,
      round: prev.round + 1,
      actionPoints: 4,
      parries: [],
      createdAt: new Date(),
    };
    template.initiative!.roll = undefined;
    template.initiative!.total = undefined;
    await this.actorRoundRepository.save(template);
  }

  public async createFromTemplate(gameId: string, actor: Actor, round: number): Promise<void> {
    const template: Partial<ActorRound> = {
      gameId: gameId,
      actorId: actor.id,
      actorName: actor.name,
      round: round,
      initiative: {
        base: 0,
        penalty: 0,
        roll: undefined,
        total: undefined,
      },
      actionPoints: 4,
      hp: {
        current: 0,
        max: 0,
      },
      fatigue: {
        endurance: 0,
        fatigue: 0,
        accumulator: 0,
      },
      penalties: [],
      attacks: [],
      parries: [],
      effects: [],
      owner: actor.owner,
      createdAt: new Date(),
    };

    if (actor.type === 'character') {
      const character = await this.characterClient.findById(actor.id);
      if (!character) {
        throw new ValidationError(`Character ${actor.id} not found`);
      }
      template.initiative!.base = character.initiative.baseBonus;
      template.attacks = this.mapAttacksFromCharacter(character);
      template.hp!.max = character.hp.max;
      template.hp!.current = character.hp.current;
    } else {
      throw new NotImplementedException('NPCs are not implemented yet');
    }
    await this.actorRoundRepository.save(template);
  }

  private mapAttacksFromCharacter(character: Character): ActorRoundAttack[] {
    return character.attacks.map((attack) => {
      return {
        attackName: attack.attackName,
        boModifiers: [],
        baseBo: attack.bo,
        currentBo: attack.bo,
        attackType: 'melee',
        attackTable: attack.attackTable,
        fumbleTable: attack.fumbleTable,
        attackSize: 'medium',
        fumble: attack.fumble,
        canThrow: false,
      } as ActorRoundAttack;
    });
  }
}
