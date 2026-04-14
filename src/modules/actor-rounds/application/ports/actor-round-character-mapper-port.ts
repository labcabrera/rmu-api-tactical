import { Character } from '../../../strategic/application/ports/character.port';
import { ActorRound } from '../../domain/aggregates/actor-round.aggregate';

export interface ActorRoundCharacterMapperPort {
  toActorRound(gameId: string, round: number, character: Character): ActorRound;
}
