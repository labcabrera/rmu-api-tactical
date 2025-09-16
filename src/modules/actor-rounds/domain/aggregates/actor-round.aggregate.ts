import { randomUUID } from 'crypto';
import { AggregateRoot } from '../../../shared/domain/entities/aggregate-root';
import { UnprocessableEntityError } from '../../../shared/domain/errors';
import { ActorRoundAttack } from '../../infrastructure/persistence/models/actor-round-attack.model';
import { ActorRoundCreatedEvent } from '../events/actor-round.events';
import { ActorRoundDefense } from '../value-objets/actor-round-defense.vo';
import { ActorRoundEffect } from '../value-objets/actor-round-effect.vo';
import { ActorRoundFatigue } from '../value-objets/actor-round-fatigue.vo';
import { ActorRoundHP } from '../value-objets/actor-round-hp.vo';
import { ActorRoundInitiative } from '../value-objets/actor-round-initiative.vo';
import { ActorRoundParry } from '../value-objets/actor-round-parry.vo';
import { ActorRoundPenalty } from '../value-objets/actor-round-penalty.vo';
import { ActorRoundUsedBo } from '../value-objets/actor-round-used-bo.vo';

export class ActorRound extends AggregateRoot<ActorRound> {
  constructor(
    public readonly id: string,
    public readonly gameId: string,
    public readonly round: number,
    public readonly actorId: string,
    public readonly actorName: string,
    public readonly initiative: ActorRoundInitiative,
    public readonly actionPoints: number,
    public hp: ActorRoundHP,
    public fatigue: ActorRoundFatigue,
    public penalties: ActorRoundPenalty[],
    public defense: ActorRoundDefense,
    public attacks: ActorRoundAttack[],
    public usedBo: ActorRoundUsedBo[],
    public parries: ActorRoundParry[],
    public effects: ActorRoundEffect[],
    public owner: string,
    public readonly createdAt: Date,
    public updatedAt: Date | undefined,
  ) {
    super();
  }

  static create(
    gameId: string,
    round: number,
    actorId: string,
    actorName: string,
    initiative: ActorRoundInitiative,
    actionPoints: number,
    hp: ActorRoundHP,
    fatigue: ActorRoundFatigue,
    penalties: ActorRoundPenalty[],
    defense: ActorRoundDefense,
    attacks: ActorRoundAttack[],
    effects: ActorRoundEffect[],
    owner: string,
  ): ActorRound {
    const actorRound = new ActorRound(
      randomUUID(),
      gameId,
      round,
      actorId,
      actorName,
      initiative,
      actionPoints,
      hp,
      fatigue,
      penalties,
      defense,
      attacks,
      [],
      [],
      effects,
      owner,
      new Date(),
      undefined,
    );
    actorRound.addDomainEvent(new ActorRoundCreatedEvent(actorRound));
    return actorRound;
  }

  static createFromPrevious(previous: ActorRound): ActorRound {
    const { gameId, round, actorId, actorName, initiative, hp, fatigue, penalties, defense, attacks, effects, owner } = previous;
    const actorRound = new ActorRound(
      randomUUID(),
      gameId,
      round + 1,
      actorId,
      actorName,
      new ActorRoundInitiative(initiative.base, initiative.penalty, undefined, undefined),
      4,
      hp,
      fatigue,
      penalties,
      defense,
      attacks,
      [],
      [],
      effects,
      owner,
      new Date(),
      undefined,
    );
    actorRound.attacks.forEach((attack) => {
      attack.currentBo = attack.baseBo;
    });
    actorRound.effects.filter((e) => e.status === 'penalty').forEach((e) => actorRound.addEffect(e));
    actorRound.addDomainEvent(new ActorRoundCreatedEvent(actorRound));
    return actorRound;
  }

  applyAttackResults(dmg: number | undefined, effects: ActorRoundEffect[] | undefined) {
    if (dmg) {
      this.hp.current -= dmg;
    }
    if (effects) {
      effects.forEach((effect) => {
        this.addEffect(effect);
      });
    }
  }

  addEffect(effect: ActorRoundEffect): void {
    const existing = this.effects.filter((e) => e.status === effect.status);
    const isUnique = ActorRoundEffect.isUnique(effect);
    if (isUnique && existing.length > 0) {
      return;
    }
    if (effect.status === 'penalty') {
      this.attacks.forEach((a) => (a.currentBo -= effect.value ?? 0));
      this.attacks.forEach((a) => (a.currentBo = Math.max(a.currentBo, 0)));
    }
    this.effects.push(effect);
  }

  declareParry(attackName: string, parry: number): void {
    const attack = this.attacks.find((a) => a.attackName === attackName);
    if (!attack) {
      throw new UnprocessableEntityError(`Attack not found: ${attackName}`);
    }
    this.parries.push(new ActorRoundParry(attackName, parry));
    this.calculateCurrentBo();
  }

  addUsedBo(attackName: string, bo: number) {
    const attack = this.attacks.find((a) => a.attackName === attackName);
    if (!attack) {
      throw new UnprocessableEntityError(`Attack not found: ${attackName}`);
    }
    const existing = this.usedBo.find((u) => u.attackName === attackName);
    if (existing) {
      existing.usedBo += bo;
    } else {
      this.usedBo.push(new ActorRoundUsedBo(attackName, bo));
    }
    this.calculateCurrentBo();
  }

  applyUpkeep() {
    if (this.effects.length === 0) {
      return;
    }
    const totalBleeding = this.effects.filter((e) => e.status === 'bleeding').reduce((sum, e) => sum + (e.value ?? 0), 0);
    this.hp.current -= totalBleeding;
    this.effects.filter((e) => e.rounds).forEach((e) => (e.rounds! -= 1));
    this.effects = this.effects.filter((e) => !e.rounds || e.rounds > 0);
    if (this.hp.current < 1) {
      this.applyAttackResults(0, [new ActorRoundEffect('dead', undefined, undefined)]);
    }
  }

  private calculateCurrentBo() {
    const penaltySum = this.getPenaltySum();
    this.attacks.forEach((a) => this.calculateAttackCurrentBo(a, penaltySum));
  }

  private calculateAttackCurrentBo(attack: ActorRoundAttack, penalty: number) {
    attack.currentBo = attack.baseBo - penalty;
    this.usedBo.filter((u) => u.attackName === attack.attackName).forEach((u) => (attack.currentBo -= u.usedBo));
    this.parries.filter((p) => p.attackName === attack.attackName).forEach((p) => (attack.currentBo -= p.parryValue));
  }

  private getPenaltySum(): number {
    return this.effects.filter((e) => e.status === 'penalty' || e.status === 'fatigue').reduce((sum, e) => sum + (e.value ?? 0), 0);
  }

  isDead(): boolean {
    return this.effects.some((e) => e.status === 'dead');
  }
}
