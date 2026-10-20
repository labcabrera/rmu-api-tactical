import { randomUUID } from 'crypto';
import { ActorRound } from '../../../src/modules/actor-rounds/domain/aggregates/actor-round.aggregate';
import { ActorRoundAttack } from '../../../src/modules/actor-rounds/domain/value-objets/actor-round-attack.vo';
import { ActorRoundDefense } from '../../../src/modules/actor-rounds/domain/value-objets/actor-round-defense.vo';
import { ActorRoundEffect } from '../../../src/modules/actor-rounds/domain/value-objets/actor-round-effect.vo';
import { ActorRoundHP } from '../../../src/modules/actor-rounds/domain/value-objets/actor-round-hp.vo';
import { ActorRoundInitiative } from '../../../src/modules/actor-rounds/domain/value-objets/actor-round-initiative.vo';
import { ActorRoundPenaltyModifier } from '../../../src/modules/actor-rounds/domain/value-objets/actor-round-penalty-modifier.vo';
import { ActorRoundPenalty } from '../../../src/modules/actor-rounds/domain/value-objets/actor-round-penalty.vo';
import { ActorRoundShield } from '../../../src/modules/actor-rounds/domain/value-objets/actor-round-shield.vo';
import { ActorRoundTrait } from '../../../src/modules/actor-rounds/domain/value-objets/actor-round-trait.vo';

export const attack = (attackName: string, baseBo: number, currentBo = baseBo, type: 'melee' | 'ranged' = 'melee') =>
  new ActorRoundAttack(attackName, [], baseBo, currentBo, type, 'arming-sword', 'melee-one-hand', 0, 3, false, null, null);

export const effect = (status: string, value?: number, rounds?: number) => new ActorRoundEffect(randomUUID(), status, value, rounds);

export interface LoadOptions {
  round?: number;
  attacks?: ActorRoundAttack[];
  penalties?: Array<[string, number]>;
  /** max, current and death threshold. */
  hp?: [number, number, number?];
  parries?: number[];
  effects?: ActorRoundEffect[];
  initiativeBase?: number;
  shield?: ActorRoundShield | null;
  traits?: ActorRoundTrait[];
}

/** An actor round as the repository loads it. */
export const load = (options: LoadOptions = {}): ActorRound => {
  const empty = ActorRound.empty();
  return ActorRound.fromProps({
    ...empty,
    gameId: 'game-1',
    actorId: 'actor-1',
    round: options.round ?? 1,
    actionPoints: 4,
    initiative: new ActorRoundInitiative(options.initiativeBase ?? 0, 0, undefined, undefined),
    hp: new ActorRoundHP(...(options.hp ?? [50, 50])),
    penalty: new ActorRoundPenalty(
      (options.penalties ?? []).map(([source, value], i) => new ActorRoundPenaltyModifier(`p${i}`, source as never, value)),
    ),
    defense: new ActorRoundDefense(10, 1, null, null, null, null, options.shield ?? null, 0),
    attacks: options.attacks ?? [],
    usedBo: [],
    parries: options.parries ?? [],
    effects: options.effects ?? [],
    alerts: [],
    traits: options.traits ?? [],
  });
};

export const stuns = (round: ActorRound) =>
  round.effects.filter(e => e.status === 'stunned').map(e => ({ value: e.value, rounds: e.rounds }));

export const stunPenalty = (round: ActorRound) => round.getPenaltiesBySource().find(p => p.source === 'stunned')?.value ?? 0;
