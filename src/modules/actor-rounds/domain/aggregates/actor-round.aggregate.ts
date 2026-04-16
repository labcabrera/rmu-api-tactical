import { randomUUID } from 'crypto';
import { AttackLocation } from '../../../actions/domain/value-objects/attack-location.vo';
import { BaseAggregateRoot } from '../../../shared/domain/aggregates/base-aggregate';
import { UnprocessableEntityError } from '../../../shared/domain/errors';
import { ActorRoundCreatedEvent } from '../events/actor-round.events';
import { ActorRoundAlert } from '../value-objets/actor-round-alert.vo';
import { ActorRoundAttack } from '../value-objets/actor-round-attack.vo';
import { ActorRoundDefense } from '../value-objets/actor-round-defense.vo';
import { ActorRoundEffect } from '../value-objets/actor-round-effect.vo';
import { ActorRoundFatigue } from '../value-objets/actor-round-fatigue.vo';
import { ActorRoundHP } from '../value-objets/actor-round-hp.vo';
import { ActorRoundInitiative } from '../value-objets/actor-round-initiative.vo';
import { ActorRoundMovement } from '../value-objets/actor-round-movement.vo';
import { ActorRoundPenaltySource } from '../value-objets/actor-round-penalty-source.vo';
import { ActorRoundPenalty } from '../value-objets/actor-round-penalty.vo';
import { ActorRoundUsedBo } from '../value-objets/actor-round-used-bo.vo';
import { ActorType } from '../value-objets/actor-type.vo';
import { ActorRoundProps } from './actor-round-props';

export class ActorRound extends BaseAggregateRoot<ActorRoundProps> {
  private constructor(
    id: string,
    public readonly gameId: string,
    public readonly round: number,
    public readonly actorType: ActorType,
    public readonly actorId: string,
    public readonly actorName: string,
    public readonly size: number,
    public readonly raceName: string,
    public readonly level: number,
    public readonly factionId: string,
    public readonly movement: ActorRoundMovement,
    public readonly initiative: ActorRoundInitiative,
    public readonly actionPoints: number,
    public hp: ActorRoundHP,
    public fatigue: ActorRoundFatigue,
    public penalty: ActorRoundPenalty,
    public defense: ActorRoundDefense,
    public attacks: ActorRoundAttack[],
    public usedBo: ActorRoundUsedBo[],
    public parries: number[],
    public effects: ActorRoundEffect[],
    public alerts: ActorRoundAlert[],
    public imageUrl: string | undefined,
    public owner: string,
    public readonly createdAt: Date,
    public readonly updatedAt: Date | null,
  ) {
    super(id);
  }

  static create(
    gameId: string,
    round: number,
    actorType: ActorType,
    actorId: string,
    actorName: string,
    size: number,
    raceName: string,
    level: number,
    factionId: string,
    movement: ActorRoundMovement,
    initiative: ActorRoundInitiative,
    actionPoints: number,
    hp: ActorRoundHP,
    fatigue: ActorRoundFatigue,
    penalty: ActorRoundPenalty,
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
      actorType,
      actorId,
      actorName,
      size,
      raceName,
      level,
      factionId,
      movement,
      initiative,
      actionPoints,
      hp,
      fatigue,
      penalty,
      defense,
      attacks,
      [],
      [],
      effects,
      alerts,
      imageUrl,
      owner,
      new Date(),
      null,
    );
    actorRound.apply(new ActorRoundCreatedEvent(actorRound));
    return actorRound;
  }

  static empty(): ActorRound {
    return ActorRound.fromProps({
      id: randomUUID(),
      gameId: '',
      round: 0,
      actorType: 'character',
      actorId: '',
      actorName: '',
      size: 1,
      raceName: '',
      level: 0,
      factionId: '',
      movement: new ActorRoundMovement(0, 0, '', ''),
      initiative: new ActorRoundInitiative(0, 0, undefined, undefined),
      actionPoints: 0,
      hp: new ActorRoundHP(0, 0),
      fatigue: new ActorRoundFatigue(0, 0, 0),
      penalty: new ActorRoundPenalty([]),
      defense: new ActorRoundDefense(0, 0, 0, 0, 0, 0, null),
      attacks: [],
      usedBo: [],
      parries: [],
      effects: [],
      alerts: [],
      imageUrl: undefined,
      owner: '',
      createdAt: new Date(),
      updatedAt: null,
    });
  }

  static fromProps(props: ActorRoundProps): ActorRound {
    return new ActorRound(
      props.id,
      props.gameId,
      props.round,
      props.actorType,
      props.actorId,
      props.actorName,
      props.size,
      props.raceName,
      props.level,
      props.factionId,
      props.movement,
      props.initiative,
      props.actionPoints,
      props.hp,
      props.fatigue,
      props.penalty,
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
      actorType,
      actorId,
      actorName,
      size,
      movement,
      raceName,
      level,
      factionId,
      initiative,
      hp,
      fatigue,
      penalty,
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
      actorType,
      actorId,
      actorName,
      size,
      raceName,
      level,
      factionId,
      movement,
      new ActorRoundInitiative(initiative.base, initiative.penalty, undefined, undefined),
      4,
      hp,
      fatigue,
      penalty,
      defense,
      attacks,
      [],
      [],
      effects,
      alerts,
      imageUrl,
      owner,
      new Date(),
      null,
    );
    actorRound.calculateCurrentBo();
    actorRound.apply(new ActorRoundCreatedEvent(actorRound));
    return actorRound;
  }

  applyAttackResults(dmg: number | undefined, effects: ActorRoundEffect[] | undefined, location: AttackLocation | undefined) {
    if (dmg) {
      this.hp.current -= dmg;
    }
    if (effects) {
      effects.forEach(effect => {
        this.addEffect(effect, 'critical', location);
      });
    }
    if (this.hp.current < 1) {
      this.addEffect(new ActorRoundEffect(randomUUID(), 'dead', undefined, undefined), undefined, undefined);
    }
    this.applyPenalties();
  }

  private addEffect(
    effect: ActorRoundEffect,
    penaltySource: ActorRoundPenaltySource | undefined,
    location: AttackLocation | undefined,
  ): void {
    // Handle penalty effects separately
    if (effect.status === 'penalty') {
      if (!penaltySource) throw new UnprocessableEntityError('Penalty effects require a penalty source');
      if (!effect.value) throw new UnprocessableEntityError('Penalty effects require a value');
      this.penalty.addModifier(penaltySource, effect.value);
      return;
    }
    if (effect.status === 'breakage_roll') {
      this.addCriticalBreakageAlert(location);
      return;
    }
    //TODO required used action points to calculate stunning effects
    if (effect.status === 'stunned') {
      effect.rounds! += 1;
    }
    if (this.isDead() && effect.status === 'dying') {
      return;
    }
    const existing = this.effects.filter(e => e.status === effect.status);
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
    this.effects = this.effects.filter(e => e.id !== effectId);
  }

  declareParry(parry: number): void {
    this.parries.push(parry);
    this.calculateCurrentBo();
  }

  addUsedBo(attackName: string, bo: number) {
    const attack = this.attacks.find(a => a.attackName === attackName);
    if (!attack) {
      throw new UnprocessableEntityError(`Attack not found: ${attackName}`);
    }
    const existing = this.usedBo.find(u => u.attackName === attackName);
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
      if (this.alerts.find(a => a.type === 'endurance')) {
        return;
      }
      const alert = ActorRoundAlert.buildEndurance();
      this.alerts.push(alert);
    } else {
      this.alerts = this.alerts.filter(a => a.type !== 'endurance');
    }
  }

  applyUpkeep() {
    if (this.effects.length === 0) {
      return;
    }
    const totalBleeding = this.effects.filter(e => e.status === 'bleeding').reduce((sum, e) => sum + (e.value ?? 0), 0);
    this.hp.current -= totalBleeding;
    if (this.effects.some(e => e.status === 'dying' && e.rounds && e.rounds <= 1)) {
      this.addEffect(new ActorRoundEffect(randomUUID(), 'dead', undefined, undefined), undefined, undefined);
    }
    this.effects.filter(e => e.rounds !== undefined && e.rounds !== null).forEach(e => (e.rounds! -= 1));
    this.effects = this.effects.filter(e => e.rounds === undefined || e.rounds === null || e.rounds > 0);
    if (this.hp.current < 1) {
      this.applyAttackResults(0, [new ActorRoundEffect(randomUUID(), 'dead', undefined, undefined)], undefined);
    }
    if (this.isDead()) {
      this.effects = this.effects.filter(e => e.status !== 'dying');
    }
    this.applyPenalties();
  }

  private applyPenalties() {
    this.applyHpPenalty();
    this.applyStunPenalty();
  }

  private applyHpPenalty() {
    const hpPercent = this.hp.current / this.hp.max;
    let hpPenalty = 0;
    if (hpPercent < 0.25) {
      hpPenalty = -75;
    } else if (hpPercent < 0.5) {
      hpPenalty = -50;
    } else if (hpPercent < 0.75) {
      hpPenalty = -25;
    }
    this.penalty.modifiers = this.penalty.modifiers.filter(m => m.source !== 'hp');
    if (hpPenalty !== 0) {
      this.penalty.addModifier('hp', hpPenalty);
    }
  }

  private applyStunPenalty() {
    const stunPenalty = 0;
    //TODO filter with delay effects
    const effectiveStunEffect = this.effects.find(e => e.status === 'stunned');
    this.penalty.modifiers = this.penalty.modifiers.filter(m => m.source !== 'stunned');
    if (effectiveStunEffect) {
      this.penalty.addModifier('stunned', stunPenalty);
    }
  }

  private calculateCurrentBo() {
    const penaltySum = this.getPenaltySum();
    this.attacks.forEach(a => this.calculateAttackCurrentBo(a, penaltySum));
  }

  private calculateAttackCurrentBo(attack: ActorRoundAttack, penalty: number) {
    attack.currentBo = attack.baseBo + penalty;
    this.usedBo.forEach(u => (attack.currentBo -= u.usedBo));
    this.parries.forEach(p => (attack.currentBo -= p));
  }

  private getPenaltySum(): number {
    return this.penalty.modifiers.reduce((sum, m) => sum + m.value, 0);
  }

  getCurrentBo(attackName: string): number {
    const attack = this.attacks.find(a => a.attackName === attackName);
    if (!attack) {
      throw new UnprocessableEntityError(`Attack not found: ${attackName}`);
    }
    return attack.currentBo;
  }

  isDead(): boolean {
    return this.effects.some(e => e.status === 'dead');
  }

  addAttackBreakageAlert(attackName: string) {
    this.alerts.push(ActorRoundAlert.buildBreakageFromAttack(attackName));
  }

  addCriticalBreakageAlert(location: AttackLocation | undefined) {
    //TODO required location
    this.alerts.push(ActorRoundAlert.buildBreakageFromCritical(location || 'chest'));
  }

  getProps(): ActorRoundProps {
    return {
      id: this.id,
      gameId: this.gameId,
      round: this.round,
      actorType: this.actorType,
      actorId: this.actorId,
      actorName: this.actorName,
      size: this.size,
      movement: this.movement,
      raceName: this.raceName,
      level: this.level,
      factionId: this.factionId,
      initiative: this.initiative,
      actionPoints: this.actionPoints,
      hp: this.hp,
      fatigue: this.fatigue,
      penalty: this.penalty,
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
