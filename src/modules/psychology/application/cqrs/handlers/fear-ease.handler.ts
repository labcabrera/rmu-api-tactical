import { Logger } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import type { ActorRound } from '../../../../actor-rounds/domain/aggregates/actor-round.js';
import { FEAR_BALK, FEAR_RETREAT } from '../../../../actor-rounds/domain/value-objects/actor-round-effect.vo.js';
import { Game } from '../../../../games/domain/aggregates/game.js';
import { NotFoundError } from '../../../../shared/domain/errors/errors.js';
import { sideMembers } from '../../../domain/services/side-strength.js';
import { GroupCheckService } from '../../services/group-check.service.js';
import { FearEaseCommand } from '../commands/fear-ease.command.js';

/** Fear effects a won round lifts (workspace spec 100, decision 22). */
const EASED_EFFECTS = [FEAR_BALK, FEAR_RETREAT];

export interface FearEaseResult {
  /** The actors whose balk or retreat was lifted. */
  actorIds: string[];
}

/**
 * Workspace spec 100, decision 22: in the current round, the standing members of the side lose `fear-balk` and
 * `fear-retreat`, and the pending `fear-ease-suggested` alerts of the side are resolved.
 */
@CommandHandler(FearEaseCommand)
export class FearEaseHandler implements ICommandHandler<FearEaseCommand, FearEaseResult> {
  private readonly logger = new Logger(FearEaseHandler.name);

  constructor(private readonly groupCheckService: GroupCheckService) {}

  async execute(command: FearEaseCommand): Promise<FearEaseResult> {
    this.logger.log(`Execute << ${JSON.stringify(command)}`);
    const { game, rounds } = await this.groupCheckService.load(command.gameId);
    const side = game.effectiveSides().find(each => each.id === command.sideId);
    if (!side) {
      throw new NotFoundError('Side', command.sideId, 'err-side-not-found');
    }
    const changed = new Set<ActorRound>();
    const actorIds: string[] = [];
    for (const member of sideMembers(rounds, side).filter(each => !each.isFallen())) {
      const eased = member.activeEffects().filter(effect => EASED_EFFECTS.includes(effect.status));
      if (eased.length === 0) continue;
      eased.forEach(effect => member.deleteEffect(effect.id));
      actorIds.push(member.actorId);
      changed.add(member);
    }
    const phase = Game.effectPhaseIn(game, game.round);
    for (const actorRound of rounds) {
      actorRound.alerts
        .filter(alert => alert.type === 'fear-ease-suggested' && alert.status === 'pending' && alert.getModifierText('sideId') === side.id)
        .forEach(alert => {
          actorRound.closeAlert(alert, phase, { outcome: 'eased', values: { actors: actorIds.length } });
          changed.add(actorRound);
        });
    }
    await this.groupCheckService.save([...changed]);
    return { actorIds };
  }
}
