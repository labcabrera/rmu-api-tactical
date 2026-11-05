import { randomUUID } from 'crypto';
import type { AttackLocation } from '../../../actions/domain/value-objects/attack-location.vo.js';
import { ActorRoundAlertModifier } from './actor-round-alert-modifier.vo.js';
import type { ActorRoundAlertStatus } from './actor-round-alert-status.vo.js';
import type { ActorRoundAlertType } from './actor-round-alert-type.vo.js';
import type { GamePhase } from '../../../games/domain/value-objects/game-phase.vo.js';
import {
  type ConcentrationFocus,
  MENTAL_FOCUS_OUTCOMES,
  type MentalFocusOutcome,
  type MentalFocusReason,
} from './concentration-focus.vo.js';

/**
 * Outcome the game master sends when it resolves an alert by hand: `passed`/`failed` of a Mental Focus maneuver
 * (workspace spec 077), `confirmed` of a `death-threshold` alert (workspace spec 079, decision A3).
 */
export type AlertOutcome = MentalFocusOutcome | 'confirmed';

export const ALERT_OUTCOMES: AlertOutcome[] = [...MENTAL_FOCUS_OUTCOMES, 'confirmed'];

/** The fields of a stored alert. */
/**
 * Critical type of the alert of a moving maneuver (or movement) gone wrong: Unbalancing (§5, workspace spec 079,
 * decision 0.1).
 */
export const MOVING_MANEUVER_CRITICAL_TYPE = 'U';

export type ActorRoundAlertData = Pick<ActorRoundAlert, 'id' | 'type' | 'message' | 'modifiers' | 'status'> & {
  reaction?: ReactionAlertData | null;
};

/** Talents that attack out of turn as a reaction (workspace spec 076, decisions B1-B3). */
export type ReactionTraitId = 'riposte' | 'opportunistic-strike';

/**
 * A `reaction-available` alert (workspace spec 076, decision B1): the actor can attack `targetActorId` at once, 0 AP,
 * because of the action `triggerActionId`. It expires when the game leaves `phase`.
 */
export interface ReactionAlertData {
  traitId: ReactionTraitId;
  triggerActionId: string;
  targetActorId: string;
  /** Fixed OB of the attack (Riposte: 50 less the attacker's total roll; it can be negative). Null: the actor's OB. */
  obOverride: number | null;
  round: number;
  phase: GamePhase;
}

/** Why the total penalties ask for an endurance roll (workspace spec 079, decision A3). */
export type PenaltyEnduranceReason = 'penalty-exertion' | 'penalty-dying';

/** What asks for a breakage check (spec 019, decision 6). */
export type BreakageOrigin = 'attack-roll' | 'critical' | 'fumble';

export class ActorRoundAlert {
  constructor(
    public readonly id: string,
    public type: ActorRoundAlertType,
    public readonly message: string,
    public readonly modifiers: ActorRoundAlertModifier[] | null,
    public status: ActorRoundAlertStatus = 'pending',
    /** The reaction of a `reaction-available` alert (workspace spec 076). */
    public readonly reaction: ReactionAlertData | null = null,
  ) {}

  /** An alert read from storage or built by hand, as an instance. */
  static from(stored: ActorRoundAlert | ActorRoundAlertData): ActorRoundAlert {
    if (stored instanceof ActorRoundAlert) {
      return stored;
    }
    const alert = stored;
    const modifiers = alert.modifiers
      ? alert.modifiers.map(modifier => new ActorRoundAlertModifier(modifier.key, modifier.value ?? null, modifier.modifier ?? null))
      : null;
    const reaction = alert.reaction ? { ...alert.reaction, obOverride: alert.reaction.obOverride ?? null } : null;
    return new ActorRoundAlert(alert.id, alert.type, alert.message, modifiers, alert.status ?? 'pending', reaction);
  }

  /** Workspace spec 076, decision B1: a reaction talent can attack out of turn. */
  static buildReaction(reaction: ReactionAlertData): ActorRoundAlert {
    return new ActorRoundAlert(randomUUID(), 'reaction-available', `Reaction available: ${reaction.traitId}`, null, 'pending', {
      ...reaction,
    });
  }

  static buildEndurance(message?: string): ActorRoundAlert {
    return new ActorRoundAlert(randomUUID(), 'endurance', message || `Endurance roll required`, null);
  }

  /**
   * Workspace spec 079, decision A3 (§9.8 Penalties): an endurance roll asked by the total penalties of the actor, not by
   * its accumulated fatigue. `penalty-exertion` (-100 or worse) for an action with effort in the round, `penalty-dying`
   * (-200 or worse) in every round.
   */
  static buildPenaltyEndurance(reason: PenaltyEnduranceReason, total: number, round: number): ActorRoundAlert {
    return new ActorRoundAlert(randomUUID(), 'endurance', `Endurance roll required by the total penalties (${total})`, [
      new ActorRoundAlertModifier('reason', null, reason),
      new ActorRoundAlertModifier('total', total, null),
      new ActorRoundAlertModifier('round', round, null),
    ]);
  }

  /** Workspace spec 079, decision A3: total penalties of -300 or worse; the game master confirms the death or dismisses it. */
  static buildDeathThreshold(total: number, round: number): ActorRoundAlert {
    return new ActorRoundAlert(
      randomUUID(),
      'death-threshold',
      `Total penalties of ${total}: the actor dies unless the game master rules otherwise`,
      [new ActorRoundAlertModifier('total', total, null), new ActorRoundAlertModifier('round', round, null)],
    );
  }

  /**
   * Workspace spec 079, decision A4 (§9.8 Knocked Back): a critical moved the actor `feet` away. The game master asks for a
   * recovery maneuver (Acrobatics or a Movement skill, difficulty of his choice) and may resolve a hazard whose critical is
   * no worse than `severityCap`, the severity of the critical that knocked it back.
   */
  static buildKnockedBack(feet: number, severityCap: string | null, criticalKey?: string): ActorRoundAlert {
    const modifiers = [new ActorRoundAlertModifier('feet', feet, null)];
    if (severityCap) modifiers.push(new ActorRoundAlertModifier('severityCap', null, severityCap));
    if (criticalKey) modifiers.push(new ActorRoundAlertModifier('criticalKey', null, criticalKey));
    return new ActorRoundAlert(randomUUID(), 'knocked-back', `Knocked back ${feet} feet`, modifiers);
  }

  /** An endurance alert asked by the accumulated fatigue (§5.5), not by the total penalties (spec 079). */
  static isFatigueEndurance(alert: Pick<ActorRoundAlert, 'type' | 'modifiers'>): boolean {
    return alert.type === 'endurance' && !alert.modifiers?.some(modifier => modifier.key === 'reason');
  }

  /** A pending endurance alert of the total penalties (spec 079) for that reason, raised in `round`. */
  static isPendingPenaltyEndurance(alert: Pick<ActorRoundAlert, 'type' | 'modifiers' | 'status'>, reason: string, round?: number): boolean {
    const text = (key: string) => alert.modifiers?.find(modifier => modifier.key === key);
    return (
      alert.type === 'endurance' &&
      alert.status === 'pending' &&
      text('reason')?.modifier === reason &&
      (round === undefined || text('round')?.value === round)
    );
  }

  /**
   * A breakage check to make (spec 019, decision 6): its origin, the penalty of the critical or fumble, the location
   * hit, the item to check by default and the ones the game master can choose.
   */
  static buildBreakage(
    origin: BreakageOrigin,
    props: { attackName?: string; location?: AttackLocation; penalty?: number; itemId?: string; candidates: string[] },
  ): ActorRoundAlert {
    const modifiers = [new ActorRoundAlertModifier('origin', null, origin)];
    if (props.attackName) modifiers.push(new ActorRoundAlertModifier('attackName', null, props.attackName));
    if (props.location) modifiers.push(new ActorRoundAlertModifier('location', null, props.location));
    if (props.penalty) modifiers.push(new ActorRoundAlertModifier('penalty', props.penalty, null));
    if (props.itemId) modifiers.push(new ActorRoundAlertModifier('itemId', null, props.itemId));
    props.candidates.forEach(candidate => modifiers.push(new ActorRoundAlertModifier('candidate', null, candidate)));
    return new ActorRoundAlert(randomUUID(), 'breakage', `Breakage roll from ${origin}`, modifiers);
  }

  /** Workspace spec 040: the physical RR an actor dying in frenzy makes in the upkeep. */
  static buildFrenzyDying(): ActorRoundAlert {
    return new ActorRoundAlert(randomUUID(), 'frenzy-dying', 'Physical resistance roll of a frenzy-dying actor', [
      new ActorRoundAlertModifier('resistance', null, 'physical'),
      new ActorRoundAlertModifier('attackLevel', 0, null),
    ]);
  }

  /** Workspace spec 068: a treated wound bleeds again (pressure let go, exertion, a failed roll). */
  static buildWoundReopened(injuryId: string, reason: string, bleeding: number): ActorRoundAlert {
    return new ActorRoundAlert(randomUUID(), 'wound-reopened', `The wound reopened (${reason})`, [
      new ActorRoundAlertModifier('injuryId', null, injuryId),
      new ActorRoundAlertModifier('reason', null, reason),
      new ActorRoundAlertModifier('bleeding', bleeding, null),
    ]);
  }

  /** Workspace spec 068, decision 5: the tourniquet has to be loosened, or the limb is lost. */
  static buildTourniquet(type: 'tourniquet-loosen' | 'limb-loss', injuryId: string, rounds: number): ActorRoundAlert {
    const message = type === 'limb-loss' ? 'The tourniquet was not loosened: the limb may be lost' : 'Loosen the tourniquet';
    return new ActorRoundAlert(randomUUID(), type, message, [
      new ActorRoundAlertModifier('injuryId', null, injuryId),
      new ActorRoundAlertModifier('rounds', rounds, null),
    ]);
  }

  /** Workspace spec 068, decision 16: a fear check is suggested to a faction; it is not rolled by itself. */
  static buildFearCheckSuggested(factionId: string, frightLevel: number, fallenShare: number): ActorRoundAlert {
    return new ActorRoundAlert(randomUUID(), 'fear-check-suggested', 'Fear check suggested', [
      new ActorRoundAlertModifier('factionId', null, factionId),
      new ActorRoundAlertModifier('frightLevel', frightLevel, null),
      new ActorRoundAlertModifier('fallenShare', fallenShare, null),
    ]);
  }

  /** Workspace spec 068, decision 18: the fear RR of an actor with Revulsion that sees blood. */
  static buildRevulsionRr(level: number): ActorRoundAlert {
    return new ActorRoundAlert(randomUUID(), 'revulsion-rr', 'Fear RR of Revulsion', [
      new ActorRoundAlertModifier('resistance', null, 'fear'),
      new ActorRoundAlertModifier('level', level, null),
    ]);
  }

  /**
   * Workspace spec 076, decision B10: a natural 01 of an actor with Terrible Luck is the worst failure possible, which
   * the game master narrates. `origin` is the roll (`maneuver`, `attack`, `spell`) and `actionId` its action.
   */
  static buildTerribleLuck(origin: string, actionId: string, attackName?: string): ActorRoundAlert {
    const modifiers = [new ActorRoundAlertModifier('origin', null, origin), new ActorRoundAlertModifier('actionId', null, actionId)];
    if (attackName) modifiers.push(new ActorRoundAlertModifier('attackName', null, attackName));
    return new ActorRoundAlert(randomUUID(), 'terrible-luck', `Terrible Luck: natural 01 (${origin})`, modifiers);
  }

  /**
   * Workspace spec 077, decisions A2.4-A2.6: a Mental Focus maneuver keeps the concentration of the actor (two foci at
   * once, stunned while concentrating, or a focus held for long). The game master marks it passed or failed; a failure
   * breaks every focus. `focus` is the one held for long.
   */
  static buildMentalFocus(reason: MentalFocusReason, focus?: ConcentrationFocus, rounds?: number): ActorRoundAlert {
    const modifiers = [new ActorRoundAlertModifier('reason', null, reason)];
    if (focus) modifiers.push(new ActorRoundAlertModifier('kind', null, focus.kind));
    if (focus?.actionId) modifiers.push(new ActorRoundAlertModifier('actionId', null, focus.actionId));
    if (focus?.effectId) modifiers.push(new ActorRoundAlertModifier('effectId', null, focus.effectId));
    if (rounds) modifiers.push(new ActorRoundAlertModifier('rounds', rounds, null));
    return new ActorRoundAlert(randomUUID(), 'mental-focus', `Mental Focus maneuver to keep the concentration (${reason})`, modifiers);
  }

  /** Text value of a modifier (`origin`, `actionId`...). */
  getModifierText(key: string): string | undefined {
    return this.modifiers?.find(modifier => modifier.key === key)?.modifier ?? undefined;
  }

  getModifierValue(key: string): number | undefined {
    return this.modifiers?.find(modifier => modifier.key === key)?.value ?? undefined;
  }

  /** The check is made: the item checked, its result and its total stay in the alert. */
  resolveBreakage(itemId: string, result: string, total: number): void {
    this.modifiers?.push(
      new ActorRoundAlertModifier('checkedItemId', null, itemId),
      new ActorRoundAlertModifier('result', null, result),
      new ActorRoundAlertModifier('total', total, null),
    );
    this.status = 'resolved';
  }

  /** A fumble that gives the fumbler a critical (spec 034): the game master rolls it, of the type the text says. */
  static buildFumbleCritical(criticalSeverity: string, attackName?: string): ActorRoundAlert {
    const modifiers = [
      new ActorRoundAlertModifier('origin', null, 'fumble'),
      new ActorRoundAlertModifier('criticalSeverity', null, criticalSeverity),
    ];
    if (attackName) modifiers.push(new ActorRoundAlertModifier('attackName', null, attackName));
    return new ActorRoundAlert(randomUUID(), 'critical', `Critical ${criticalSeverity} from a fumble`, modifiers);
  }

  /**
   * Workspace spec 077, decision D2: a critical of a fall or a falling object rolled later by the game master, with the
   * hazard it comes from.
   */
  static buildHazardCritical(criticalType: string, criticalSeverity: string, hazardId: string): ActorRoundAlert {
    return new ActorRoundAlert(randomUUID(), 'critical', `Critical ${criticalSeverity} on ${criticalType} from a hazard`, [
      new ActorRoundAlertModifier('origin', null, 'hazard'),
      new ActorRoundAlertModifier('criticalType', null, criticalType),
      new ActorRoundAlertModifier('criticalSeverity', null, criticalSeverity),
      new ActorRoundAlertModifier('hazardId', null, hazardId),
    ]);
  }

  /**
   * Workspace spec 077, decision D5: an absolute failure of a climbing or jumping maneuver or movement suggests a fall.
   * `origin` is `maneuver` or `movement`; the game master resolves it with the hazards endpoint or dismisses it.
   */
  static buildFallSuggested(origin: 'maneuver' | 'movement', actionId: string, skillId: string): ActorRoundAlert {
    return new ActorRoundAlert(randomUUID(), 'fall-suggested', `A fall may follow the ${skillId} ${origin}`, [
      new ActorRoundAlertModifier('origin', null, origin),
      new ActorRoundAlertModifier('actionId', null, actionId),
      new ActorRoundAlertModifier('skillId', null, skillId),
      new ActorRoundAlertModifier('kind', null, 'fall'),
    ]);
  }

  static buildCritical(criticalType: string, criticalSeverity: string, message?: string): ActorRoundAlert {
    return new ActorRoundAlert(randomUUID(), 'critical', message || `Critical ${criticalSeverity} on ${criticalType}`, [
      new ActorRoundAlertModifier('criticalType', null, criticalType),
      new ActorRoundAlertModifier('criticalSeverity', null, criticalSeverity),
    ]);
  }
}
