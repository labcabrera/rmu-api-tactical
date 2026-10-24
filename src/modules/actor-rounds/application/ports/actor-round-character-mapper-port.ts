import { Character } from '../../../strategic/application/ports/character.port';
import type { StrategicItem } from '../../../strategic/application/ports/item.port';
import { ActorRound } from '../../domain/aggregates/actor-round.aggregate';

export interface ActorRoundCharacterMapperPort {
  /** `items`: the strategic items of the character (spec 019); none for strategic versions before it. */
  toActorRound(gameId: string, round: number, character: Character, items?: StrategicItem[]): ActorRound;
}
