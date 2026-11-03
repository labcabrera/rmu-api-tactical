import { Page } from '../../../shared/application/pagination/page.js';
import type { StrategicMember } from '../../domain/value-objects/strategic-member.vo.js';
import { Game } from '../../domain/aggregates/game.js';

export interface GameRepository {
  findById(id: string): Promise<Game | null>;

  findByStrategicId(strategicGameId: string): Promise<Game[]>;

  /** The games still in `created` that have the faction (spec 055: a faction deleted in strategic leaves them). */
  findCreatedByFaction(factionId: string): Promise<Game[]>;

  findByRsql(
    rsql: string | undefined,
    page: number,
    size: number,
    filter?: Record<string, unknown>,
    sort?: Record<string, 1 | -1>,
  ): Promise<Page<Game>>;

  /** The ids of the games that match a filter, such as the games a user can read (spec 021). */
  findIds(filter: Record<string, unknown>): Promise<string[]>;

  /**
   * Workspace spec 072: the members and the owner, each when given, of a strategic game, written on all its tactical games.
   * Answers how many changed.
   */
  updateStrategicMembers(
    strategicGameId: string,
    strategicGameOwner: string | undefined,
    members: StrategicMember[] | undefined,
  ): Promise<number>;

  /** Workspace spec 072: the players of a strategic faction, written on all the tactical games of its strategic game. */
  updateFactionPlayers(strategicGameId: string, factionId: string, players: string[]): Promise<number>;

  /** Workspace spec 072: a deleted strategic faction leaves `factionPlayers` of every tactical game. */
  removeFactionPlayers(factionId: string): Promise<number>;

  save(entity: Game): Promise<Game>;

  /** Writes the game, provided it is still at the version it was loaded with (else a `version-conflict`). */
  update(entity: Game): Promise<Game>;

  deleteById(id: string): Promise<Game | null>;
}

export const GAME_REPOSITORY = Symbol('GameRepository');
