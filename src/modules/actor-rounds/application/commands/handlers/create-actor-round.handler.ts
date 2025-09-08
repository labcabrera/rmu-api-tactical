import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ActorRound } from '../../../domain/entities/actor-round.aggregate';
import type { ActorRoundRepository } from '../../ports/out/character-round.repository';
import { ActorRoundService } from '../../services/actor-round-service';
import { CreateActorRoundCommand } from '../create-actor-round.command';

@CommandHandler(CreateActorRoundCommand)
export class CreateActorRoundHandler implements ICommandHandler<CreateActorRoundCommand, ActorRound> {
  constructor(
    @Inject() private readonly actorRoundService: ActorRoundService,
    @Inject('ActorRoundRepository') private readonly actorRoundRepository: ActorRoundRepository,
    // @Inject('ActorRoundEventBus') private readonly gameEventBus: GameEventBusPort,
  ) {}

  async execute(command: CreateActorRoundCommand): Promise<ActorRound> {
    const actor = await this.actorRoundService.create(command.gameId, command.actor, command.round);
    const updated = await this.actorRoundRepository.save(actor);
    //const events = actor.pullDomainEvents();
    // events.forEach((event) => this.gameEventBus.publish(event));
    return updated;
  }
}
