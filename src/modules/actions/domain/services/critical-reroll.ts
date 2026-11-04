import type { ActorRound } from '../../../actor-rounds/domain/aggregates/actor-round.js';
import {
  type ActorRoundEffect,
  CRITICAL_REROLL,
  type CriticalRerollKind,
} from '../../../actor-rounds/domain/value-objects/actor-round-effect.vo.js';

/** The `critical-reroll` effect that lets a critical be rolled again, and the actor that has it. */
export interface CriticalRerollGrant {
  kind: CriticalRerollKind;
  holder: ActorRound;
  effect: ActorRoundEffect;
}

const rerollOf = (holder: ActorRound | undefined, kind: CriticalRerollKind, foeId: string | undefined): ActorRoundEffect | undefined =>
  foeId
    ? (holder?.activeEffects() ?? []).find(
        effect => effect.status === CRITICAL_REROLL && effect.targetActorId === foeId && (effect.data?.kind ?? 'offense') === kind,
      )
    : undefined;

/**
 * Workspace spec 076, decision B8: who can roll again the critical of an attack. The attacker with a `critical-reroll`
 * of kind `offense` against the target (Sense Weakness) first, else the target with one of kind `defense` against the
 * attacker (Study Offense). Undefined when neither has it.
 */
export const findCriticalReroll = (source: ActorRound | undefined, target: ActorRound | undefined): CriticalRerollGrant | undefined => {
  const offense = rerollOf(source, 'offense', target?.actorId);
  if (offense) {
    return { kind: 'offense', holder: source!, effect: offense };
  }
  const defense = rerollOf(target, 'defense', source?.actorId);
  return defense ? { kind: 'defense', holder: target!, effect: defense } : undefined;
};
