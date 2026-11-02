import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { Actor } from '../../../../games/domain/value-objects/actor.vo.js';
import { type NpcPort, NPC_PORT } from '../../../../npcs/application/ports/npc.port.js';
import { ValidationError } from '../../../../shared/domain/errors/errors.js';
import { type CharacterPort, CHARACTER_PORT } from '../../../../strategic/application/ports/character.port.js';
import { type ItemPort, ITEM_PORT } from '../../../../strategic/application/ports/item.port.js';
import { ActorRound } from '../../../domain/aggregates/actor-round.js';
import { type ActorRoundCharacterMapperPort, ACTOR_ROUND_CHARACTER_MAPPER_PORT } from '../../ports/actor-round-character-mapper.port.js';
import { type ActorRoundNpcMapperPort, ACTOR_ROUND_NPC_MAPPER_PORT } from '../../ports/actor-round-npc-mapper.port.js';
import { type ActorRoundRepository, ACTOR_ROUND_REPOSITORY } from '../../ports/actor-round-repository.port.js';
import { CreateActorRoundCommand } from '../commands/create-actor-round.command.js';

@CommandHandler(CreateActorRoundCommand)
export class CreateActorRoundHandler implements ICommandHandler<CreateActorRoundCommand, ActorRound> {
  private readonly logger = new Logger(CreateActorRoundHandler.name);

  constructor(
    @Inject(ACTOR_ROUND_REPOSITORY) private readonly actorRoundRepository: ActorRoundRepository,
    @Inject(CHARACTER_PORT) private readonly characterClient: CharacterPort,
    @Inject(ACTOR_ROUND_CHARACTER_MAPPER_PORT) private readonly characterMapper: ActorRoundCharacterMapperPort,
    @Inject(ITEM_PORT) private readonly itemClient: ItemPort,
    @Inject(NPC_PORT) private readonly npcPort: NpcPort,
    @Inject(ACTOR_ROUND_NPC_MAPPER_PORT) private readonly npcMapper: ActorRoundNpcMapperPort,
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
    }
    return await this.buildActorRoundFromNpc(gameId, round, actor);
  }

  /** Spec 055: a specimen of an NPC, from its stat block; it always comes in unhurt (nothing is kept between games). */
  private async buildActorRoundFromNpc(gameId: string, round: number, actor: Actor): Promise<ActorRound> {
    if (!actor.npcId) throw new ValidationError(`Actor ${actor.name} is an NPC without npcId`);
    const npc = await this.npcPort.findById(actor.npcId);
    if (!npc) throw new ValidationError(`NPC ${actor.npcId} not found`, 'err-npc-not-found');
    return this.npcMapper.toActorRound(gameId, round, actor, npc);
  }

  private async buildActorRoundFromCharacter(gameId: string, round: number, characterId: string): Promise<ActorRound> {
    const character = await this.characterClient.findById(characterId);
    if (!character) throw new ValidationError(`Character ${characterId} not found`);
    const items = await this.itemClient.findByCharacterId(characterId);
    return this.characterMapper.toActorRound(gameId, round, character, items);
  }
}
