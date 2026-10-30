import type { Actor } from '../../../games/domain/value-objects/actor.vo.js';
import type { Npc } from '../../../npcs/application/ports/npc.port.js';
import { ActorRound } from '../../domain/aggregates/actor-round.js';

export interface ActorRoundNpcMapperPort {
  /** The actor round of a specimen (`actor`) of an NPC, from its Combat Stat Block (spec 055, decision 4). */
  toActorRound(gameId: string, round: number, actor: Actor, npc: Npc): ActorRound;
}

export const ACTOR_ROUND_NPC_MAPPER_PORT = Symbol('ActorRoundNpcMapperPort');
