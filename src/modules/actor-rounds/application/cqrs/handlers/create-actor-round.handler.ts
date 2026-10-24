import { Inject, Logger, NotImplementedException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Actor } from '../../../../games/domain/value-objects/actor.vo';
import { ValidationError } from '../../../../shared/domain/errors/errors';
import { type CharacterPort, CHARACTER_PORT } from '../../../../strategic/application/ports/character.port';
import { type ItemPort, ITEM_PORT } from '../../../../strategic/application/ports/item.port';
import { ActorRound } from '../../../domain/aggregates/actor-round';
import { type ActorRoundCharacterMapperPort, ACTOR_ROUND_CHARACTER_MAPPER_PORT } from '../../ports/actor-round-character-mapper.port';
import { type ActorRoundRepository, ACTOR_ROUND_REPOSITORY } from '../../ports/actor-round-repository.port';
import { CreateActorRoundCommand } from '../commands/create-actor-round.command';

@CommandHandler(CreateActorRoundCommand)
export class CreateActorRoundHandler implements ICommandHandler<CreateActorRoundCommand, ActorRound> {
  private readonly logger = new Logger(CreateActorRoundHandler.name);

  constructor(
    @Inject(ACTOR_ROUND_REPOSITORY) private readonly actorRoundRepository: ActorRoundRepository,
    @Inject(CHARACTER_PORT) private readonly characterClient: CharacterPort,
    @Inject(ACTOR_ROUND_CHARACTER_MAPPER_PORT) private readonly characterMapper: ActorRoundCharacterMapperPort,
    @Inject(ITEM_PORT) private readonly itemClient: ItemPort,
  ) {}

  async execute(command: CreateActorRoundCommand): Promise<ActorRound> {
    this.logger.log(`Creating actor round ${command.actor.id} for game ${command.gameId} round ${command.round}`);
    const actor = await this.buildActorRound(command.gameId, command.actor, command.round);
    const updated = await this.actorRoundRepository.save(actor);
    return updated;
  }

  public async buildActorRound(gameId: string, actor: Actor, round: number): Promise<ActorRound> {
    if (round === 1) {
      return await this.buildFromTemplate(gameId, actor, round);
    }
    // character could be added in a later round
    const prev = await this.actorRoundRepository.findByActorIdAndRound(gameId, actor.id, round - 1);
    if (prev) {
      return ActorRound.createFromPrevious(prev);
    }
    return await this.buildFromTemplate(gameId, actor, round);
  }

  public async buildFromTemplate(gameId: string, actor: Actor, round: number): Promise<ActorRound> {
    if (actor.type === 'character') {
      return await this.buildActorRoundFromCharacter(gameId, round, actor.id);
    } else {
      throw new NotImplementedException(`Actor type ${actor.type} not supported yet`);
    }
  }

  private async buildActorRoundFromCharacter(gameId: string, round: number, characterId: string): Promise<ActorRound> {
    const character = await this.characterClient.findById(characterId);
    if (!character) throw new ValidationError(`Character ${characterId} not found`);
    const items = await this.itemClient.findByCharacterId(characterId);
    return this.characterMapper.toActorRound(gameId, round, character, items);
  }
}
