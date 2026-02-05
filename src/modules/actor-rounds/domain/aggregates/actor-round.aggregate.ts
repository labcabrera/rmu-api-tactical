import { AggregateRoot } from '@nestjs/cqrs';
import { randomUUID } from 'crypto';
import { UnprocessableEntityError } from '../../../shared/domain/errors';
import { DomainEvent } from '../../../shared/domain/events/domain-event';
import { ActorRoundCreatedEvent } from '../events/actor-round.events';
import { ActorRoundAlert } from '../value-objets/actor-round-alert.vo';
import { ActorRoundAttack } from '../value-objets/actor-round-attack.vo';
import { ActorRoundDefense } from '../value-objets/actor-round-defense.vo';
import { ActorRoundEffect } from '../value-objets/actor-round-effect.vo';
import { ActorRoundFaction } from '../value-objets/actor-round-faction.vo';
import { ActorRoundFatigue } from '../value-objets/actor-round-fatigue.vo';
import { ActorRoundHP } from '../value-objets/actor-round-hp.vo';
import { ActorRoundInitiative } from '../value-objets/actor-round-initiative.vo';
import { ActorRoundPenalty } from '../value-objets/actor-round-penalty.vo';
import { ActorRoundUsedBo } from '../value-objets/actor-round-used-bo.vo';

export interface ActorRoundProps {
  id: string;
  gameId: string;
  round: number;
  actorId: string;
  actorName: string;
  raceName: string;
  level: number;
  faction: ActorRoundFaction;
  initiative: ActorRoundInitiative;
  actionPoints: number;
  hp: ActorRoundHP;
  fatigue: ActorRoundFatigue;
  penalties: ActorRoundPenalty[];
  defense: ActorRoundDefense;
  attacks: ActorRoundAttack[];
  usedBo: ActorRoundUsedBo[];
  parries: number[];
  effects: ActorRoundEffect[];
  alerts: ActorRoundAlert[];
  imageUrl: string | undefined;
  owner: string;
  createdAt: Date;
  updatedAt?: Date;
}

export class ActorRound extends AggregateRoot<DomainEvent<ActorRound>> {
  private constructor(
    public readonly id: string,
    public readonly gameId: string,
    public readonly round: number,
    public readonly actorId: string,
    public readonly actorName: string,
    public readonly raceName: string,
    public readonly level: number,
    public readonly faction: ActorRoundFaction,
    public readonly initiative: ActorRoundInitiative,
    public readonly actionPoints: number,
    public hp: ActorRoundHP,
    public fatigue: ActorRoundFatigue,
    public penalties: ActorRoundPenalty[],
    public defense: ActorRoundDefense,
    public attacks: ActorRoundAttack[],
    public usedBo: ActorRoundUsedBo[],
    public parries: number[],
    public effects: ActorRoundEffect[],
    public alerts: ActorRoundAlert[],
    public imageUrl: string | undefined,
    public owner: string,
    public readonly createdAt: Date,
    public readonly updatedAt: Date | undefined,
  ) {
    super();
  }

  static create(
    gameId: string,
    round: number,
    actorId: string,
    actorName: string,
    raceName: string,
    level: number,
    faction: ActorRoundFaction,
    initiative: ActorRoundInitiative,
    actionPoints: number,
    hp: ActorRoundHP,
    fatigue: ActorRoundFatigue,
    penalties: ActorRoundPenalty[],
    defense: ActorRoundDefense,
    attacks: ActorRoundAttack[],
    effects: ActorRoundEffect[],
    alerts: ActorRoundAlert[],
    imageUrl: string | undefined,
    owner: string,
  ): ActorRound {
    const actorRound = new ActorRound(
      randomUUID(),
      gameId,
      round,
      actorId,
      actorName,
      raceName,
      level,
      faction,
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
      alerts,
      imageUrl,
      owner,
      new Date(),
      undefined,
    );
    actorRound.apply(new ActorRoundCreatedEvent(actorRound));
    return actorRound;
  }

  static fromProps(props: ActorRoundProps): ActorRound {
    return new ActorRound(
      props.id,
      props.gameId,
      props.round,
      props.actorId,
      props.actorName,
      props.raceName,
      props.level,
      props.faction,
      props.initiative,
      props.actionPoints,
      props.hp,
      props.fatigue,
      props.penalties,
      props.defense,
      props.attacks,
      props.usedBo,
      props.parries,
      props.effects,
      props.alerts,
      props.imageUrl,
      props.owner,
      props.createdAt,
      props.updatedAt,
    );
  }

  static createFromPrevious(previous: ActorRound): ActorRound {
    const {
      gameId,
      round,
      actorId,
      actorName,
      raceName,
      level,
      faction,
      initiative,
      hp,
      fatigue,
      penalties,
      defense,
      attacks,
      effects,
      alerts,
      imageUrl,
      owner,
    } = previous;
    const actorRound = new ActorRound(
      randomUUID(),
      gameId,
      round + 1,
      actorId,
      actorName,
      raceName,
      level,
      faction,
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
      alerts,
      imageUrl,
      owner,
      new Date(),
      undefined,
    );
    actorRound.calculateCurrentBo();
    actorRound.apply(new ActorRoundCreatedEvent(actorRound));
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
    if (this.hp.current < 1) {
      this.addEffect(new ActorRoundEffect(randomUUID(), 'dead', undefined, undefined));
    }
  }

  addEffect(effect: ActorRoundEffect): void {
    //TODO required used action points to calculate stunning effects
    if (effect.status === 'stunned') {
      effect.rounds! += 1;
    }
    if (this.isDead() && effect.status === 'dying') {
      return;
    }
    const existing = this.effects.filter((e) => e.status === effect.status);
    const isUnique = ActorRoundEffect.isUnique(effect);
    if (isUnique && existing.length > 0) {
      return;
    }
    const isStackable = ActorRoundEffect.isStackable(effect);
    if (isStackable) {
      if (existing.length > 1) {
        throw new UnprocessableEntityError(`Multiple non-unique effects found: ${effect.status}`);
      } else if (existing.length === 1) {
        existing[0].value! += effect.value!;
        return;
      }
    }
    this.effects.push(effect);
  }

  deleteEffect(effectId: string) {
    this.effects = this.effects.filter((e) => e.id !== effectId);
  }

  declareParry(parry: number): void {
    this.parries.push(parry);
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

  addFatigue(fatigue: number) {
    this.fatigue.accumulator += fatigue;
    if (this.fatigue.accumulator >= 100) {
      if (this.alerts.find((a) => a.type === 'endurance')) {
        return;
      }
      this.alerts.push(new ActorRoundAlert(randomUUID(), 'endurance', 'Required endurance check due to fatigue'));
    } else {
      this.alerts = this.alerts.filter((a) => a.type !== 'endurance');
    }
  }

  applyUpkeep() {
    if (this.effects.length === 0) {
      return;
    }
    const totalBleeding = this.effects
      .filter((e) => e.status === 'bleeding')
      .reduce((sum, e) => sum + (e.value ?? 0), 0);
    this.hp.current -= totalBleeding;
    if (this.effects.some((e) => e.status === 'dying' && e.rounds && e.rounds <= 1)) {
      this.addEffect(new ActorRoundEffect(randomUUID(), 'dead', undefined, undefined));
    }
    this.effects.filter((e) => e.rounds !== undefined && e.rounds !== null).forEach((e) => (e.rounds! -= 1));
    this.effects = this.effects.filter((e) => e.rounds === undefined || e.rounds === null || e.rounds > 0);
    if (this.hp.current < 1) {
      this.applyAttackResults(0, [new ActorRoundEffect(randomUUID(), 'dead', undefined, undefined)]);
    }
    if (this.isDead()) {
      this.effects = this.effects.filter((e) => e.status !== 'dying');
    }
  }

  private calculateCurrentBo() {
    const penaltySum = this.getPenaltySum();
    this.attacks.forEach((a) => this.calculateAttackCurrentBo(a, penaltySum));
  }

  private calculateAttackCurrentBo(attack: ActorRoundAttack, penalty: number) {
    attack.currentBo = attack.baseBo + penalty;
    this.usedBo.forEach((u) => (attack.currentBo -= u.usedBo));
    this.parries.forEach((p) => (attack.currentBo -= p));
  }

  private getPenaltySum(): number {
    return this.effects
      .filter((e) => e.status === 'penalty' || e.status === 'fatigue')
      .reduce((sum, e) => sum + (e.value ?? 0), 0);
  }

  getCurrentBo(attackName: string): number {
    const attack = this.attacks.find((a) => a.attackName === attackName);
    if (!attack) {
      throw new UnprocessableEntityError(`Attack not found: ${attackName}`);
    }
    return attack.currentBo;
  }

  isDead(): boolean {
    return this.effects.some((e) => e.status === 'dead');
  }

  toProps(): ActorRoundProps {
    return {
      id: this.id,
      gameId: this.gameId,
      round: this.round,
      actorId: this.actorId,
      actorName: this.actorName,
      raceName: this.raceName,
      level: this.level,
      faction: this.faction,
      initiative: this.initiative,
      actionPoints: this.actionPoints,
      hp: this.hp,
      fatigue: this.fatigue,
      penalties: this.penalties,
      defense: this.defense,
      attacks: this.attacks,
      usedBo: this.usedBo,
      parries: this.parries,
      effects: this.effects,
      alerts: this.alerts,
      imageUrl: this.imageUrl,
      owner: this.owner,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
