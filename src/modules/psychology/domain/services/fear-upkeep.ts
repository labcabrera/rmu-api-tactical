import type { ActorRound } from '../../../actor-rounds/domain/aggregates/actor-round.js';
import { FEAR_BROKEN, FEAR_ROUTED, UNCONSCIOUS } from '../../../actor-rounds/domain/value-objects/actor-round-effect.vo.js';
import {
  crossedThresholds,
  fallenThresholdKey,
  type FallenThreshold,
  type PsychologyTables,
} from '../value-objects/psychology-tables.vo.js';

/** Defect of the actors that take a fear RR at the sight of blood (decision 18). */
export const REVULSION_TRAIT = 'revulsion';

/** Corpse level when core serves none. */
const DEFAULT_CORPSE_LEVEL = 10;

/** A faction that crossed a threshold of fallen allies for the first time in the game (decision 16). */
export interface SuggestedFearCheck {
  factionId: string;
  frightLevel: number;
  fallenShare: number;
  /** Keys of every threshold crossed, to store in the game. */
  keys: string[];
  /** The actor round the alert goes to: the first able actor of the faction. */
  actorRound: ActorRound;
}

export interface RevulsionCheck {
  actorRound: ActorRound;
  level: number;
}

/**
 * The fear alerts of the upkeep (workspace spec 068, decisions 16 and 18), computed from the actor rounds of the
 * round that ends. Nothing is rolled: the game master decides.
 */
export class FearUpkeep {
  /** Fallen: dead, unconscious, routed or broken. */
  static isFallen(actorRound: ActorRound): boolean {
    return (
      actorRound.isDead() || actorRound.hasEffect(UNCONSCIOUS) || actorRound.hasEffect(FEAR_ROUTED) || actorRound.hasEffect(FEAR_BROKEN)
    );
  }

  /**
   * By faction, the share of fallen actors. The first time it crosses a threshold, the highest one crossed is
   * suggested; the ones already in `alerted` (by faction) are not suggested again.
   */
  static suggestedChecks(
    actorRounds: ActorRound[],
    thresholds: FallenThreshold[] | null | undefined,
    alerted: Record<string, string[]>,
  ): SuggestedFearCheck[] {
    const byFaction = new Map<string, ActorRound[]>();
    actorRounds
      .filter(actorRound => !!actorRound.factionId)
      .forEach(actorRound => byFaction.set(actorRound.factionId, [...(byFaction.get(actorRound.factionId) ?? []), actorRound]));
    const checks: SuggestedFearCheck[] = [];
    for (const [factionId, members] of byFaction) {
      const share = members.filter(member => FearUpkeep.isFallen(member)).length / members.length;
      const fresh = crossedThresholds(thresholds, share).filter(row => !(alerted[factionId] ?? []).includes(fallenThresholdKey(row)));
      const recipient = members.find(member => !FearUpkeep.isFallen(member) && !member.isIncapacitated());
      if (fresh.length === 0 || !recipient) {
        continue;
      }
      const highest = fresh[fresh.length - 1];
      checks.push({
        factionId,
        frightLevel: highest.frightLevel,
        fallenShare: Math.round(share * 100) / 100,
        keys: fresh.map(row => fallenThresholdKey(row)),
        actorRound: recipient,
      });
    }
    return checks;
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
