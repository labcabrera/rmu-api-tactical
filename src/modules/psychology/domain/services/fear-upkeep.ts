import type { ActorRound } from '../../../actor-rounds/domain/aggregates/actor-round.js';
import { FEAR_BALK, FEAR_RETREAT } from '../../../actor-rounds/domain/value-objects/actor-round-effect.vo.js';
import type { GameSide, PsychologyRules } from '../../../games/domain/value-objects/game-side.vo.js';
import {
  crossedThresholds,
  fallenThresholdKey,
  type FallenThreshold,
  type PsychologyTables,
} from '../value-objects/psychology-tables.vo.js';
import { fallenLevels, type SideStrength, sideMembers, sideStrength } from './side-strength.js';

/** Defect of the actors that take a fear RR at the sight of blood (decision 18). */
export const REVULSION_TRAIT = 'revulsion';

/** Corpse level when core serves none. */
const DEFAULT_CORPSE_LEVEL = 10;

/** Group triggers of the house rules (workspace spec 100, decision 19), with their fright level. */
export type HouseTrigger =
  'strength-50' | 'strength-below-50' | 'strength-25' | 'strength-10' | 'outnumbered-2' | 'outnumbered-3' | 'leader-down';

export const HOUSE_TRIGGER_LEVELS: Record<HouseTrigger, number> = {
  'strength-50': 5,
  'strength-below-50': 10,
  'strength-25': 15,
  'strength-10': 20,
  'outnumbered-2': 5,
  'outnumbered-3': 10,
  'leader-down': 5,
};

/** Individual triggers of the house rules (workspace spec 100, decision 20), both of fright level 10. */
export type IndividualTrigger = 'surrounded' | 'alone';
export const INDIVIDUAL_TRIGGER_LEVEL = 10;
/** Distinct attackers in a round that surround an actor. */
export const SURROUNDING_ATTACKERS = 3;

/** Key of the triggers alerted to a side in `Game.fearThresholdsAlerted` (workspace spec 100). */
export const sideAlertKey = (sideId: string): string => `side:${sideId}`;
/** Key of the individual triggers alerted to an actor. */
export const actorAlertKey = (actorId: string): string => `actor:${actorId}`;

/** A side that crossed new fear triggers in the game (spec 068, decision 16; workspace spec 100, decision 19). */
export interface SuggestedFearCheck {
  sideId: string;
  /** The factions of the side. */
  factionIds: string[];
  /** The faction of the actor the alert goes to. */
  factionId: string;
  frightLevel: number;
  /** Share of the side fallen: by heads with `book`, by levels with `house`; 0 to 1, 2 decimals. */
  fallenShare: number;
  rules: PsychologyRules;
  /** The new triggers: threshold keys of Table 14-3a with `book`, `HouseTrigger` keys with `house`. */
  triggers: string[];
  /** Keys to store in the game under `alertKey`. */
  keys: string[];
  alertKey: string;
  /** The actor round the alert goes to: the first member of the side not fallen. */
  actorRound: ActorRound;
}

export interface RevulsionCheck {
  actorRound: ActorRound;
  level: number;
}

/** An attack applied in the round that ends (workspace spec 100, decision 20): who hit whom, and from where. */
export interface AppliedAttack {
  attackerId: string;
  targetId: string;
  /** `flank` or `rear` when the attacker was on the target's flank or rear (`positionalTarget` of the attack). */
  position?: string | null;
}

/** A fear RR suggested to one actor by an individual trigger (workspace spec 100, decision 20). */
export interface IndividualFearCheck {
  actorRound: ActorRound;
  trigger: IndividualTrigger;
  sideId: string;
  frightLevel: number;
  /** The distinct attackers of a surrounded actor. */
  attackerIds: string[];
  alertKey: string;
}

/** A side that won the round with members still balking or retreating (workspace spec 100, decision 22). */
export interface FearEaseSuggestion {
  sideId: string;
  factionIds: string[];
  /** The standing members balking or retreating. */
  actorIds: string[];
  /** The first standing member of the side, who gets the alert. */
  actorRound: ActorRound;
}

const round2 = (value: number) => Math.round(value * 100) / 100;

/**
 * The fear alerts of the upkeep (workspace spec 068, decisions 16 and 18; workspace spec 100, decisions 19-22),
 * computed from the actor rounds of the round that ends, by side. Nothing is rolled: the game master decides.
 */
export class FearUpkeep {
  /** Fallen (workspace spec 100, decision 10): incapacitated, routed or broken. */
  static isFallen(actorRound: ActorRound): boolean {
    return actorRound.isFallen();
  }

  /** The triggers already alerted to a side: its own key and, for the games in progress, the keys of its factions. */
  static alertedFor(alerted: Record<string, string[]>, side: GameSide): Set<string> {
    return new Set([...(alerted[sideAlertKey(side.id)] ?? []), ...side.factionIds.flatMap(factionId => alerted[factionId] ?? [])]);
  }

  /**
   * By side, the new triggers of a group fear check; a side gets one alert with the highest fright level of its new
   * triggers. `book`: the share of fallen heads against the thresholds of Table 14-3a. `house`: the strength in levels
   * (decision 19). Triggers already in `alerted` are not suggested again.
   */
  static suggestedChecks(
    actorRounds: ActorRound[],
    sides: GameSide[],
    rules: PsychologyRules,
    thresholds: FallenThreshold[] | null | undefined,
    alerted: Record<string, string[]>,
  ): SuggestedFearCheck[] {
    const strengths = sideStrength(actorRounds, sides);
    const checks: SuggestedFearCheck[] = [];
    sides.forEach((side, index) => {
      const members = sideMembers(actorRounds, side);
      const recipient = members.find(member => !member.isFallen());
      if (members.length === 0 || !recipient) {
        return;
      }
      const done = FearUpkeep.alertedFor(alerted, side);
      let fresh: { key: string; level: number }[];
      let share: number;
      if (rules === 'house') {
        const strength = strengths[index];
        const others = strengths.filter(other => other.sideId !== side.id).reduce((sum, other) => sum + other.standingLevels, 0);
        const leader = side.leaderActorId ? members.find(member => member.actorId === side.leaderActorId) : undefined;
        fresh = FearUpkeep.houseTriggers(strength, others, !!leader?.isFallen())
          .filter(trigger => !done.has(trigger))
          .map(trigger => ({ key: trigger, level: HOUSE_TRIGGER_LEVELS[trigger] }));
        share = 1 - strength.standingLevels / strength.totalLevels;
      } else {
        share = members.filter(member => member.isFallen()).length / members.length;
        fresh = crossedThresholds(thresholds, share)
          .map(row => ({ key: fallenThresholdKey(row), level: row.frightLevel }))
          .filter(row => !done.has(row.key));
      }
      if (fresh.length === 0) {
        return;
      }
      const keys = fresh.map(each => each.key);
      checks.push({
        sideId: side.id,
        factionIds: [...side.factionIds],
        factionId: recipient.factionId,
        frightLevel: Math.max(...fresh.map(each => each.level)),
        fallenShare: round2(share),
        rules,
        triggers: keys,
        keys,
        alertKey: sideAlertKey(side.id),
        actorRound: recipient,
      });
    });
    return checks;
  }

  /**
   * The group triggers of the house rules a side meets now (decision 19): its standing strength against its total and
   * against the standing strength of the other sides, and its leader down.
   */
  static houseTriggers(strength: SideStrength, enemyStanding: number, leaderDown: boolean): HouseTrigger[] {
    const triggers: HouseTrigger[] = [];
    if (strength.totalLevels <= 0) return triggers;
    const share = strength.standingLevels / strength.totalLevels;
    if (share <= 0.5) triggers.push('strength-50');
    if (share < 0.5) triggers.push('strength-below-50');
    if (share < 0.25) triggers.push('strength-25');
    if (share < 0.1) triggers.push('strength-10');
    const own = strength.standingLevels;
    if (own > 0 && enemyStanding >= 2 * own) triggers.push('outnumbered-2');
    if (own > 0 && enemyStanding >= 3 * own) triggers.push('outnumbered-3');
    if (leaderDown) triggers.push('leader-down');
    return triggers;
  }

  /**
   * The individual triggers of the house rules (decision 20), once per actor and game: `surrounded` when attacks of 3
   * or more distinct attackers, or from its flank and its rear, were applied to it in the round; `alone` when it is the
   * only member of its side (of 2 or more) not fallen. Fallen actors get none.
   */
  static individualChecks(
    actorRounds: ActorRound[],
    sides: GameSide[],
    attacks: AppliedAttack[],
    alerted: Record<string, string[]>,
  ): IndividualFearCheck[] {
    const checks: IndividualFearCheck[] = [];
    for (const side of sides) {
      const members = sideMembers(actorRounds, side);
      const standing = members.filter(member => !member.isFallen());
      for (const member of standing) {
        const key = actorAlertKey(member.actorId);
        const done = alerted[key] ?? [];
        const against = attacks.filter(attack => attack.targetId === member.actorId && attack.attackerId !== member.actorId);
        const attackerIds = [...new Set(against.map(attack => attack.attackerId))];
        const positions = new Set(against.map(attack => attack.position));
        const surrounded = attackerIds.length >= SURROUNDING_ATTACKERS || (positions.has('flank') && positions.has('rear'));
        const base = { actorRound: member, sideId: side.id, frightLevel: INDIVIDUAL_TRIGGER_LEVEL, alertKey: key };
        if (surrounded && !done.includes('surrounded')) {
          checks.push({ ...base, trigger: 'surrounded', attackerIds });
        }
        if (members.length >= 2 && standing.length === 1 && !done.includes('alone')) {
          checks.push({ ...base, trigger: 'alone', attackerIds: [] });
        }
      }
    }
    return checks;
  }

  /**
   * The end of the fear (decision 22): the fallen levels of each side now, and the sides that won the round (the other
   * sides lost more levels since `previous` than they did) with standing members balking or retreating. Without
   * `previous` (the first upkeep) nothing is suggested; a side with a pending suggestion gets no other.
   */
  static easeChecks(
    actorRounds: ActorRound[],
    sides: GameSide[],
    previous: Record<string, number> | null | undefined,
  ): { fallen: Record<string, number>; suggestions: FearEaseSuggestion[] } {
    const strengths = sideStrength(actorRounds, sides);
    const fallen = Object.fromEntries(strengths.map(strength => [strength.sideId, fallenLevels(strength)]));
    const suggestions: FearEaseSuggestion[] = [];
    if (!previous || Object.keys(previous).length === 0) {
      return { fallen, suggestions };
    }
    const delta = (sideId: string) => fallen[sideId] - (previous[sideId] ?? 0);
    for (const side of sides) {
      const othersDelta = sides.filter(other => other.id !== side.id).reduce((sum, other) => sum + delta(other.id), 0);
      if (othersDelta <= delta(side.id)) continue;
      const members = sideMembers(actorRounds, side);
      const standing = members.filter(member => !member.isFallen());
      const afraid = standing.filter(member => member.hasEffect(FEAR_BALK) || member.hasEffect(FEAR_RETREAT));
      const pending = members.some(member =>
        member.alerts.some(
          alert => alert.type === 'fear-ease-suggested' && alert.status === 'pending' && alert.getModifierText('sideId') === side.id,
        ),
      );
      if (afraid.length === 0 || pending) continue;
      suggestions.push({
        sideId: side.id,
        factionIds: [...side.factionIds],
        actorIds: afraid.map(member => member.actorId),
        actorRound: standing[0],
      });
    }
    return { fallen, suggestions };
  }

  /**
   * Revulsion: each actor with the defect, not fallen, sees the bleeding of the others (without a map, every actor of
   * the game) plus `corpseLevel` for each corpse that was bleeding. No alert when the level is 0.
   */
  static revulsionChecks(actorRounds: ActorRound[], tables: Pick<PsychologyTables, 'revulsion'> | null | undefined): RevulsionCheck[] {
    const corpseLevel = tables?.revulsion?.corpseLevel ?? DEFAULT_CORPSE_LEVEL;
    return actorRounds
      .filter(actorRound => actorRound.traitTier(REVULSION_TRAIT) > 0 && !actorRound.isIncapacitated())
      .map(actorRound => {
        const others = actorRounds.filter(other => other !== actorRound);
        const bleeding = others.filter(other => !other.isDead()).reduce((sum, other) => sum + other.getBleeding(), 0);
        const corpses = others.filter(other => other.isDead() && other.injuries.some(injury => (injury.bleeding ?? 0) > 0)).length;
        return { actorRound, level: bleeding + corpses * corpseLevel };
      })
      .filter(check => check.level > 0);
  }
}
