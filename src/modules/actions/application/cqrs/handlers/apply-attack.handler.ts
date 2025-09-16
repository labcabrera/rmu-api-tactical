import { Inject, Logger } from '@nestjs/common';
import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { AddEffectsCommand } from '../../../../actor-rounds/application/cqrs/commands/add-effects.command';
import { AddFatigueCommand } from '../../../../actor-rounds/application/cqrs/commands/add-fatigue.command';
import { DeclareActorParryCommand } from '../../../../actor-rounds/application/cqrs/commands/declare-actor-parry.command';
import { SubstractBoCommand } from '../../../../actor-rounds/application/cqrs/commands/substract-bo.command';
import type { ActorRoundRepository } from '../../../../actor-rounds/application/ports/out/character-round.repository';
import { ActorRound } from '../../../../actor-rounds/domain/aggregates/actor-round.aggregate';
import { ActorRoundEffect } from '../../../../actor-rounds/domain/value-objets/actor-round-effect.vo';
import type { GameRepository } from '../../../../games/application/ports/game.repository';
import { NotFoundError, UnprocessableEntityError } from '../../../../shared/domain/errors';
import { StrategicGame } from '../../../../strategic/application/ports/strategic-game.port';
import { StrategicGameApiClient } from '../../../../strategic/infrastructure/api-clients/api-strategic-game.adapter';
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
    @Inject('StrategicGameClient') private readonly strategicGamePort: StrategicGameApiClient,
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
    const strategicGame = await this.strategicGamePort.findById(game.strategicGameId);
    if (!strategicGame) {
      throw new NotFoundError('StrategicGame', game.strategicGameId);
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
    const substractBoCommands = this.processAttackSourceSubstractBo(action, actors, command.userId, command.roles);
    await Promise.all(substractBoCommands.map((cmd) => this.commandBus.execute(cmd)));

    actionAttacks.forEach((actionAttack) => {
      this.processAttackTargets(actionAttack, actors, updateCommands, command.userId, command.roles);
    });
    await Promise.all(Array.from(updateCommands.values()).map((cmd) => this.commandBus.execute(cmd)));

    await this.processDeclareActorParry(action, command.userId, command.roles);
    await this.processFatigue(action, game.round, strategicGame, command.userId, command.roles);

    action.updatedAt = new Date();
    action.phaseEnd = game.getActionPhase();
    action.status = 'completed';
    const updated = await this.actionRepository.update(action.id, action);
    await this.actionEventBus.publish(new ActionUpdatedEvent(updated));
    return updated;
  }

  private processAttackSourceSubstractBo(action: Action, actors: ActorRound[], userId: string, roles: string[]): SubstractBoCommand[] {
    const actorRound = actors.find((a) => a.actorId === action.actorId);
    if (!actorRound) {
      throw new UnprocessableEntityError('Actor not found');
    }
    const substractBoCommands: SubstractBoCommand[] = [];
    action.attacks?.forEach((a) => {
      const attack = action.getAttackByName(a.modifiers.attackName);
      if (!attack) {
        throw new UnprocessableEntityError(`Attack ${a.modifiers.attackName} not found`);
      }
      if (attack.modifiers.bo > 0) {
        substractBoCommands.push(new SubstractBoCommand(actorRound.id, a.modifiers.attackName, attack.modifiers.bo, userId, roles));
      }
    });
    return substractBoCommands;
  }

  private async processDeclareActorParry(action: Action, userId: string, roles: string[]): Promise<void> {
    if (!action.parries || action.parries.length === 0) {
      return;
    }
    for (const parry of action.parries.filter((p) => p.parry > 0)) {
      const command = DeclareActorParryCommand.fromParry(action.actorId, action.round, parry, userId, roles);
      await this.commandBus.execute(command);
    }
  }

  private processAttackTargets(
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

  private async processFatigue(
    action: Action,
    round: number,
    strategicGame: StrategicGame,
    userId: string,
    roles: string[],
  ): Promise<void> {
    action.processFatigue(strategicGame.options?.fatigueMultiplier);
    if (action.fatigue) {
      const command = new AddFatigueCommand(action.actorId, round, action.fatigue, userId, roles);
      await this.commandBus.execute(command);
    }
  }
}
