import { Inject, Logger } from '@nestjs/common';
import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { AddEffectsCommand } from '../../../../actor-rounds/application/cqrs/commands/add-effects.command';
import type { ActorRoundRepository } from '../../../../actor-rounds/application/ports/out/character-round.repository';
import { ActorRound } from '../../../../actor-rounds/domain/aggregates/actor-round.aggregate';
import { ActorRoundEffect } from '../../../../actor-rounds/domain/value-objets/actor-round-effect.vo';
import type { GameRepository } from '../../../../games/application/ports/game.repository';
import { NotFoundError, UnprocessableEntityError } from '../../../../shared/domain/errors';
import { Action } from '../../../domain/aggregates/action.aggregate';
import { ActionUpdatedEvent } from '../../../domain/events/action-events';
import { ActionAttack } from '../../../domain/value-objects/action-attack.vo';
import type { ActionEventBusPort } from '../../ports/action-event-bus.port';
import type { ActionRepository } from '../../ports/action.repository';
import type { AttackPort } from '../../ports/attack.port';
import { ApplyAttackCommand } from '../commands/apply-attack.command';

@CommandHandler(ApplyAttackCommand)
export class ApplyAttackHandler implements ICommandHandler<ApplyAttackCommand, Action> {
  private readonly logger = new Logger(ApplyAttackHandler.name);

  constructor(
    @Inject('GameRepository') private readonly gameRepository: GameRepository,
    @Inject('ActionRepository') private readonly actionRepository: ActionRepository,
    @Inject('ActorRoundRepository') private readonly actorRoundRepository: ActorRoundRepository,
    @Inject('AttackPort') private readonly attackPort: AttackPort,
    @Inject('ActionEventBus') private readonly actionEventBus: ActionEventBusPort,
    private readonly commandBus: CommandBus,
  ) {}

  async execute(command: ApplyAttackCommand): Promise<Action> {
    this.logger.log(`Execute << ${JSON.stringify(command)}`);
    const action = await this.actionRepository.findById(command.actionId);
    if (!action) {
      throw new NotFoundError('Action', command.actionId);
    }
    const game = await this.gameRepository.findById(action.gameId);
    if (!game) {
      throw new NotFoundError('Game', action.gameId);
    }
    action.checkValidApplyResults();
    const actionAttacks = action.attacks!;
    const actorRoundIds = Array.from(new Set(actionAttacks.map((a) => a.modifiers.targetId).concat([action.actorId])));
    const rsql = `gameId==${action.gameId};round==${game.round};actorId=in=(${actorRoundIds.join(',')})`;
    const actors = (await this.actorRoundRepository.findByRsql(rsql, 0, 1000)).content;
    if (actorRoundIds.length !== actors.length) {
      throw new UnprocessableEntityError('Some actors not found in the current round');
    }
    const updateCommands = new Map<string, AddEffectsCommand>();

    actionAttacks.forEach((actionAttack) => {
      this.processAttack(actionAttack, actors, updateCommands, command.userId, command.roles);
    });

    await Promise.all(Array.from(updateCommands.values()).map((cmd) => this.commandBus.execute(cmd)));

    action.updatedAt = new Date();
    action.status = 'completed';
    const updated = await this.actionRepository.update(action.id, action);
    await this.actionEventBus.publish(new ActionUpdatedEvent(updated));
    return updated;
  }

  private processAttack(
    actionAttack: ActionAttack,
    actors: ActorRound[],
    updateCommands: Map<string, AddEffectsCommand>,
    userId: string,
    roles: string[],
  ) {
    const target = actors.find((a) => a.actorId === actionAttack.modifiers.targetId);
    if (!target) {
      throw new UnprocessableEntityError('Actor not found');
    }
    let dmg = 0;
    dmg += actionAttack.results?.attackTableEntry?.damage || 0;
    const criticalEffects: ActorRoundEffect[] = [];
    actionAttack.results?.criticals?.forEach((cr) => {
      dmg = cr.result?.damage || 0;
      cr.result?.effects?.forEach((e) => {
        const effect = new ActorRoundEffect(e.status, e.value, e.rounds);
        criticalEffects.push(effect);
      });
    });
    if (dmg === 0 && criticalEffects.length === 0) {
      return;
    }
    if (updateCommands.has(target.id)) {
      const cmd = updateCommands.get(target.id)!;
      cmd.dmg += dmg || 0;
      cmd.effects.push(...criticalEffects);
    } else {
      const cmd = new AddEffectsCommand(target.id, dmg, criticalEffects, userId, roles);
      updateCommands.set(target.id, cmd);
    }
  }
}
