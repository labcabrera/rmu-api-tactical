import { Inject, Injectable } from '@nestjs/common';
import { type ActorRoundRepository, ACTOR_ROUND_REPOSITORY } from '../../../actor-rounds/application/ports/actor-round-repository.port';
import { ActorRound } from '../../../actor-rounds/domain/aggregates/actor-round';
import { type GameRepository, GAME_REPOSITORY } from '../../../games/application/ports/game-repository.port';
import { Game } from '../../../games/domain/aggregates/game';
import { openRoundsOf, STRATEGIC_GAME_PORT } from '../../../strategic/application/ports/strategic-game.port';
import type { StrategicGamePort } from '../../../strategic/application/ports/strategic-game.port';
import { Action } from '../../domain/aggregates/action';

/** Past the action phases: no capacity left in the round. */
const NO_PHASE_LEFT = 5;

/**
 * Computes the AP and readiness of actions for the responses (spec 011, §4): it reads each game (and its strategic
 * game, for the open rounds option) once and the actor rounds of each game round once, however many actions there
 * are.
 */
@Injectable()
export class ActionApStateService {
  constructor(
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
    @Inject(ACTOR_ROUND_REPOSITORY) private readonly actorRoundRepository: ActorRoundRepository,
    @Inject(STRATEGIC_GAME_PORT) private readonly strategicGameClient: StrategicGamePort,
  ) {}

  async refresh(actions: Action[]): Promise<void> {
    if (actions.length === 0) {
      return;
    }
    const gameIds = [...new Set(actions.map(action => action.gameId))];
    const games = new Map<string, Game | null>();
    await Promise.all(gameIds.map(async id => games.set(id, await this.gameRepository.findById(id))));
    const openRounds = new Map<string, boolean>();
    await Promise.all([...games.entries()].map(async ([id, game]) => openRounds.set(id, await this.readOpenRounds(game))));
    const keys = [...new Set(actions.map(action => ActionApStateService.key(action.gameId, action.round)))];
    const actorRounds = new Map<string, ActorRound[]>();
    await Promise.all(
      keys.map(async key => {
        const [gameId, round] = key.split('|');
        const page = await this.actorRoundRepository.findByRsql(`gameId==${gameId};round==${round}`, 0, 1000);
        actorRounds.set(key, page.content);
      }),
    );
    actions.forEach(action => {
      const actorRound = actorRounds.get(ActionApStateService.key(action.gameId, action.round))?.find(ar => ar.actorId === action.actorId);
      const phase = ActionApStateService.phaseOf(games.get(action.gameId), action.round);
      action.refreshApState(actorRound, phase, openRounds.get(action.gameId) ?? true);
    });
  }

  /**
   * The open rounds option of the game's strategic game (spec 011, §7), on by default. It only tells `blocked` from
   * `unreachable`, so a strategic API that cannot be read leaves the default instead of failing the response.
   */
  private async readOpenRounds(game: Game | null | undefined): Promise<boolean> {
    if (!game) {
      return true;
    }
    try {
      return openRoundsOf(await this.strategicGameClient.findById(game.strategicGameId));
    } catch {
      return true;
    }
  }

  /**
   * Phase the capacity left is counted from: the current action phase in the game's round (phase 1 while declaring
   * the initiative), none left in the upkeep or in an earlier round.
   */
  static phaseOf(game: Game | null | undefined, round: number): number | null {
    if (!game) {
      return null;
    }
    if (round < game.round) {
      return NO_PHASE_LEFT;
    }
    if (round > game.round) {
      return 1;
    }
    if (game.phase === 'declare_initiative') {
      return 1;
    }
    return Game.toActionPhase(game.phase) ?? NO_PHASE_LEFT;
  }

  private static key(gameId: string, round: number): string {
    return `${gameId}|${round}`;
  }
}
