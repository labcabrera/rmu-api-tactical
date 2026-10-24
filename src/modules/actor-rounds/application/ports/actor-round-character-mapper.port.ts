import type { Character } from '../../../strategic/application/ports/character.port.js';
import type { StrategicItem } from '../../../strategic/application/ports/item.port.js';
import { ActorRound } from '../../domain/aggregates/actor-round.js';

export interface ActorRoundCharacterMapperPort {
  /** `items`: the strategic items of the character (spec 019); none for strategic versions before it. */
  toActorRound(gameId: string, round: number, character: Character, items?: StrategicItem[]): ActorRound;
}

export const ACTOR_ROUND_CHARACTER_MAPPER_PORT = Symbol('ActorRoundCharacterMapperPort');
