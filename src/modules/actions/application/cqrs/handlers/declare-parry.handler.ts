/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { ActorRoundRepository } from '../../../../actor-rounds/application/ports/out/character-round.repository';
import { ActorRound } from '../../../../actor-rounds/domain/entities/actor-round.aggregate';
import type { GameRepository } from '../../../../games/application/ports/game.repository';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors';
import type { CharacterPort } from '../../../../strategic/application/ports/character.port';
import { Action } from '../../../domain/entities/action.aggregate';
import { ActionUpdatedEvent } from '../../../domain/events/action-events';
import type { ActionEventBusPort } from '../../ports/action-event-bus.port';
import type { ActionRepository } from '../../ports/action.repository';
import type { AttackPort } from '../../ports/attack.port';
import { DeclareParryCommand } from '../commands/declare-parry.command';

@CommandHandler(DeclareParryCommand)
export class DeclareParryHandler implements ICommandHandler<DeclareParryCommand, Action> {
  private readonly logger = new Logger(DeclareParryHandler.name);

  constructor(
    @Inject('GameRepository') private readonly gameRepository: GameRepository,
    @Inject('ActorRoundRepository') private readonly actorRoundRepository: ActorRoundRepository,
    @Inject('ActionRepository') private readonly actionRepository: ActionRepository,
    @Inject('CharacterClient') private readonly characterClient: CharacterPort,
    @Inject('AttackPort') private readonly attackPort: AttackPort,
    @Inject('ActionEventBus') private readonly actionEventBus: ActionEventBusPort,
  ) {}

  async execute(command: DeclareParryCommand): Promise<Action> {
    this.logger.log(`Execute << ${JSON.stringify(command)}`);
    const action = await this.actionRepository.findById(command.actionId);
    if (!action) {
      throw new NotFoundError('Action', command.actionId);
    }
    const game = await this.gameRepository.findById(action.gameId);
    if (!game) {
      throw new NotFoundError('Game', action.gameId);
    }
    const attacks = action.attacks!;
    action.checkValidParryDeclaration();

    const actorIds = this.resolveActorIds(action);
    const rsql = `gameId==${action.gameId};round==${game.round};actorId=in=(${actorIds.join(',')})`;
    const actorRounds = (await this.actorRoundRepository.findByRsql(rsql, 0, 1000)).content;
    if (actorIds.length !== actorRounds.length) {
      throw new ValidationError('Unable to find all actor rounds');
    }

    // Update attack parries with command values
    attacks.forEach((attack) => {
      attack.parries!.forEach((parry) => {
        const actorRound = actorRounds.find((ar) => ar.actorId === parry.parryActorId)!;
        const commandParry = command.parries.find((p) => p.parryActorId === parry.parryActorId)!;
        const parryValue = this.validateParry(commandParry?.parry, actorRound, attack.modifiers.targetId !== parry.parryActorId);
        parry.parry = parryValue;
      });
      attack.parries = attack.parries!.filter((p) => p.parry > 0);
    });
    // Update attack total parry and sent to attack port
    await Promise.all(
      attacks.map(async (attack) => {
        attack.modifiers.parry = attack.parries!.reduce((sum, p) => sum + p.parry, 0);
        const updatedAttack = await this.attackPort.updateParry(attack.externalAttackId!, attack.modifiers.parry);
        attack.calculated!.rollModifiers = updatedAttack.calculated.rollModifiers;
        attack.calculated!.rollTotal = updatedAttack.calculated.rollTotal;
      }),
    );
    //TODO update target and protectors actor rounds
    action.updatedAt = new Date();
    const updated = await this.actionRepository.update(action.id, action);
    await this.actionEventBus.publish(new ActionUpdatedEvent(updated));
    return action;
  }

  private resolveActorIds(action: Action): string[] {
    const actorIds = new Set<string>();
    actorIds.add(action.actorId);
    action.attacks?.forEach((attack) => {
      actorIds.add(attack.modifiers.targetId);
    });
    return Array.from(actorIds);
  }

  private validateParry(parry: number, actor: ActorRound, protect: boolean): number {
    if (!protect) {
      const bos = actor.attacks.map((a) => a.currentBo);
      const maxBo = Math.max(...bos);
      if (parry > maxBo) {
        throw new ValidationError(`Parry ${parry} higher than max BO ${maxBo}`);
      }
    } else {
      //TODO check protecting skill
    }
    return parry;
  }
}
