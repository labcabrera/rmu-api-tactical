import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { type AttackTablePort, ATTACK_TABLE_PORT } from '../../../actions/application/ports/attack-table.port.js';
import { type CriticalTablePort, CRITICAL_TABLE_PORT } from '../../../actions/application/ports/critical-table.port.js';
import type { AttackLocation } from '../../../actions/domain/value-objects/attack-location.vo.js';
import { ValidationError } from '../../../shared/domain/errors/errors.js';
import { adjustSeverity, expandSeverity, severitySteps } from '../../../shared/domain/severity.js';
import { hitMultiplierOf, stepsOf, stepsOfWeight } from '../../../shared/domain/size-scale.js';
import { ActorRound } from '../../domain/aggregates/actor-round.js';
import { CriticalInjuryFactory, type CriticalEffectData } from '../../domain/services/critical-injury.factory.js';
import { ActorRoundAlert } from '../../domain/value-objects/actor-round-alert.vo.js';
import {
  ActorRoundEffect,
  ARM_USELESS,
  CANNOT_PARRY,
  HALF_ACTIVITY,
  HALF_MOVEMENT,
  INITIATIVE_PENALTY,
  UNCONSCIOUS,
} from '../../domain/value-objects/actor-round-effect.vo.js';
import type { ActorRoundHazard, HazardAttackTable, HazardCritical } from '../../domain/value-objects/actor-round-hazard.vo.js';
import { ActorRoundTrait, LIGHT_BONED, RAPID_BLEEDER, SLOW_BLEEDER } from '../../domain/value-objects/actor-round-trait.vo.js';
import type { HpChange } from '../../domain/value-objects/hp-log-entry.vo.js';
import { type InjurySource, sideOfRoll } from '../../domain/value-objects/injury.vo.js';
import type { HazardRequest } from '../cqrs/commands/resolve-hazard.command.js';

/** Armour type when the actor has none. */
const NO_ARMOR = 1;
/** A useless limb of the critical texts (spec 034): an arm is `arm_useless`, a leg half movement. */
const LIMB_USELESS = 'limb_useless';
/** Effects that start `delay` rounds later (spec 034). */
const DELAYED_STATUSES = [HALF_ACTIVITY, CANNOT_PARRY, INITIATIVE_PENALTY, UNCONSCIOUS];

/** Where the critical of a hazard or an alert happens: the game, the round and the phase. */
export interface HazardContext {
  gameId: string;
  gameName?: string;
  round: number;
  /** 0 before the action phases, 1-4 in them. */
  phase: number;
}

/** A critical to roll on the actor: its table, severity and roll, and the location fixed by its origin (heat). */
export interface CriticalToApply {
  criticalType: string;
  criticalSeverity: string;
  roll: number;
  location?: AttackLocation;
  source: InjurySource;
}

export interface AppliedCritical {
  criticalKey: string;
  damage: number;
  text: string;
  location: string | null;
}

/** Location of a critical table result (limbs in singular) as an attack location. */
const toAttackLocation = (location: string | undefined | null): AttackLocation | undefined => {
  const value = location === 'arm' ? 'arms' : location === 'leg' ? 'legs' : location;
  return (['head', 'chest', 'abdomen', 'arms', 'legs'] as AttackLocation[]).find(candidate => candidate === value);
};

/**
 * Attacks without an attacker (workspace spec 077, decision D1), sibling of the burn of a cauterization: falls (§15.4)
 * and falling objects (§15.5). The table is looked up with the body AT of the actor, its damage scaled by the Hit
 * Multiplier of the attack size, the severity moved by the sizes and the fall control, and the criticals built with
 * `CriticalInjuryFactory`. Registered in the actions module, which has the attack and critical table ports.
 */
@Injectable()
export class HazardAttackService {
  constructor(
    @Inject(ATTACK_TABLE_PORT) private readonly attackTable: AttackTablePort,
    @Inject(CRITICAL_TABLE_PORT) private readonly criticalTable: CriticalTablePort,
  ) {}

  /**
   * Resolves the hazard on the actor and keeps it in `hazards`: the hits of the table (`hazard` in the hits log) and
   * each critical with its roll, or a `critical` alert with origin `hazard` for the ones without it.
   */
  async resolve(actor: ActorRound, request: HazardRequest, fallControlSteps: number, context: HazardContext): Promise<ActorRoundHazard> {
    if (!Number.isFinite(request.distanceFeet) || request.distanceFeet <= 0) {
      throw new ValidationError('A hazard falls more than 0 feet', 'err-hazard-invalid-distance', { distanceFeet: request.distanceFeet });
    }
    const fall = request.kind === 'fall';
    const heightFeet = fall ? (request.heightFeet ?? actor.height) : null;
    if (fall && request.deliberate && (heightFeet === null || heightFeet === undefined)) {
      throw new ValidationError('A deliberate jump takes the height of the actor off the distance: send heightFeet');
    }
    const objectSteps = fall ? null : HazardAttackService.objectSteps(request);
    const attackSize = fall ? actor.size : objectSteps!;
    // §15.5 and workspace spec 077, P12: an object smaller than the target goes to Rock, the same size or larger to Crush.
    const attackTable: HazardAttackTable = fall || attackSize >= actor.size ? 'crush' : 'rock';
    // §15.4: +1 per foot, less the height of a deliberate jump, never below 0. §15.5: the feet of the fall.
    const ob = fall ? Math.max(0, request.distanceFeet - (request.deliberate ? heightFeet! : 0)) : request.distanceFeet;
    const shield = attackTable === 'rock' && request.shield && !!actor.defense.shield;
    // §15.4: only magical DB against a fall; §15.5: the DB counts normally (the shield only on Rock).
    const db = request.db ?? (fall ? 0 : actor.defense.bd + (shield ? actor.defense.shield!.db : 0));
    const total = request.roll + ob - db;
    const armor = actor.defense.bodyAt ?? actor.defense.at ?? NO_ARMOR;
    const entry = await this.attackTable.lookup({ attackTable, roll: total, armor, location: undefined });
    const multiplier = hitMultiplierOf(attackSize);
    const baseDamage = entry.damage || 0;
    const damage = Math.round(baseDamage * multiplier);
    const steps = severitySteps({
      'attack-size': attackSize,
      'target-size': -(actor.criticalSize ?? actor.size),
      'light-boned': ActorRoundTrait.tierOf(actor.traits, LIGHT_BONED),
      'critical-code': actor.reduceCriticalSeverity ? -1 : 0,
      'fall-control': fall ? fallControlSteps : 0,
    });
    const originalSeverity = entry.criticalType && entry.criticalSeverity ? entry.criticalSeverity : null;
    const severity = originalSeverity
      ? adjustSeverity(
          originalSeverity,
          steps.reduce((sum, step) => sum + step.value, 0),
          actor.reduceCriticalSeverity,
        )
      : null;
    const hazard: ActorRoundHazard = {
      id: randomUUID(),
      kind: request.kind,
      round: actor.round,
      phase: context.phase,
      distanceFeet: request.distanceFeet,
      deliberate: fall && request.deliberate,
      heightFeet: heightFeet ?? null,
      fallControlActionId: fall ? request.fallControlActionId : null,
      fallControlSteps: fall ? fallControlSteps : 0,
      objectSize: fall ? null : (request.objectSize ?? null),
      weightLbs: fall ? null : (request.weightLbs ?? null),
      shield,
      attackTable,
      attackSize,
      ob,
      db,
      roll: request.roll,
      total,
      armor,
      text: entry.text,
      baseDamage,
      multiplier,
      damage,
      originalSeverity,
      severity,
      severitySteps: steps,
      criticals: [],
      note: request.note,
      createdAt: new Date().toISOString(),
    };
    const hazardSource: InjurySource = {
      kind: 'hazard',
      tacticalGameId: context.gameId,
      tacticalGameName: context.gameName,
      round: actor.round,
    };
    if (damage > 0) {
      const changes: HpChange[] = [{ kind: 'hazard', amount: -damage, phase: context.phase }];
      actor.applyAttackResults(damage, undefined, undefined, this.application(actor, context), [], changes);
    }
    const criticalType = entry.criticalType ?? '';
    const severities = severity ? expandSeverity(severity) : [];
    for (const [index, criticalSeverity] of severities.entries()) {
      const roll = request.criticalRolls[index];
      const critical: HazardCritical = {
        criticalType,
        criticalSeverity,
        roll: roll ?? null,
        damage: null,
        text: null,
        location: null,
        alertId: null,
      };
      if (roll === undefined || roll === null) {
        const alert = ActorRoundAlert.buildHazardCritical(criticalType, criticalSeverity, hazard.id);
        actor.alerts.push(alert);
        critical.alertId = alert.id;
      } else {
        const applied = await this.applyCritical(actor, { criticalType, criticalSeverity, roll, source: hazardSource }, context);
        Object.assign(critical, { damage: applied.damage, text: applied.text, location: applied.location });
      }
      hazard.criticals.push(critical);
    }
    actor.hazards.push(hazard);
    return hazard;
  }

  /**
   * Looks the critical up and applies it to the actor as the critical of an attack (spec 013, §3): its hits (`critical`
   * in the hits log), its injuries and its effects. Used by the hazards and by the critical alerts (workspace spec 077,
   * decision D3).
   */
  async applyCritical(actor: ActorRound, critical: CriticalToApply, context: HazardContext): Promise<AppliedCritical> {
    const criticalType = critical.criticalType.toUpperCase();
    const result = await this.criticalTable.lookup({
      criticalType,
      criticalSeverity: critical.criticalSeverity,
      roll: critical.roll,
      location: critical.location,
    });
    const criticalKey = `${criticalType}-${critical.criticalSeverity}-${critical.roll}`;
    const source: InjurySource = { ...critical.source, criticalKey };
    const bleedingShift = ActorRoundTrait.tierOf(actor.traits, RAPID_BLEEDER) - ActorRoundTrait.tierOf(actor.traits, SLOW_BLEEDER);
    const location = result.location || critical.location || null;
    const built = CriticalInjuryFactory.build({
      effects: (result.effects || []).filter(effect => effect.applyTo !== 'source'),
      criticalType,
      location,
      side: sideOfRoll(critical.roll),
      injury: result.injury,
      bleedingShift,
      source,
    });
    const effects = built.effects.map(effect => HazardAttackService.toRoundEffect(effect, source, actor.round));
    const damage = Math.max(0, result.damage || 0);
    const changes: HpChange[] = [{ kind: 'critical', amount: -damage, criticalKey, phase: context.phase }];
    actor.applyAttackResults(damage, effects, toAttackLocation(location), this.application(actor, context), built.injuries, changes);
    return { criticalKey, damage, text: result.text, location };
  }

  /** Steps from medium of a falling object: its size, or else the size of its weight (Table 9-4a). */
  private static objectSteps(request: HazardRequest): number {
    if (request.objectSize) {
      const steps = stepsOf(request.objectSize);
      if (steps !== undefined) return steps;
    }
    if (typeof request.weightLbs === 'number' && Number.isFinite(request.weightLbs) && request.weightLbs >= 0) {
      return stepsOfWeight(request.weightLbs);
    }
    throw new ValidationError('A falling object needs its objectSize or its weightLbs');
  }

  private static toRoundEffect(effect: CriticalEffectData, source: InjurySource, round: number): ActorRoundEffect {
    const status = effect.status === LIMB_USELESS ? (effect.location === 'leg' ? HALF_MOVEMENT : ARM_USELESS) : effect.status;
    const fromRound = effect.delay && DELAYED_STATUSES.includes(status) ? round + effect.delay : undefined;
    return new ActorRoundEffect(
      randomUUID(),
      status,
      effect.value,
      effect.rounds,
      undefined,
      undefined,
      undefined,
      undefined,
      source,
      fromRound,
    );
  }

  private application(actor: ActorRound, context: HazardContext) {
    return { phase: context.phase, spentAp: context.phase >= 1 && context.phase <= 4 ? actor.getSpentAp(context.phase) : 0 };
  }
}
