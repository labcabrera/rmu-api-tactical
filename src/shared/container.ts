import { Container } from 'inversify';
import 'reflect-metadata';

import { Logger } from '@domain/ports/logger';
import { ActionRepository } from '@domain/ports/outbound/action.repository';
import { CharacterRoundRepository } from '@domain/ports/outbound/character-round.repository';
import { RaceClient } from '../domain/ports/outbound/race-client';
import { SkillCategoryClient } from '../domain/ports/outbound/skill-category-client';
import { SkillClient } from '../domain/ports/outbound/skill-client';
import { CharacterProcessorService } from '../domain/services/character-processor.service';

import { CreateActionUseCase } from '@application/use-cases/actions/create-action.usecase';
import { DeleteActionUseCase } from '@application/use-cases/actions/delete-action.usecase';
import { FindActionByIdUseCase } from '@application/use-cases/actions/find-action-by-id.usecase';
import { FindActionsUseCase } from '@application/use-cases/actions/find-actions.usecase';
import { FindCharacterRoundsUseCase } from '@application/use-cases/character-rounds/find-character-rounds.usecase';
import { UpdateInitiativeUseCase } from '@application/use-cases/character-rounds/update-initiative.usecase';
import { AddItemUseCase } from '../application/use-cases/characters/add-item.usecase';
import { AddSkillUseCase } from '../application/use-cases/characters/add-skill.usecase';
import { CreateCharacterUseCase } from '../application/use-cases/characters/create-character.usecase';
import { DeleteCharacterUseCase } from '../application/use-cases/characters/delete-character.usecase';
import { DeleteItemUseCase } from '../application/use-cases/characters/delete-item.usecase';
import { DeleteSkillUseCase } from '../application/use-cases/characters/delete-skill.usecase';
import { EquipItemUseCase } from '../application/use-cases/characters/equip-item.usecase';
import { FindTCharacterByIdUseCase } from '../application/use-cases/characters/find-character-by-id.usecase';
import { FindCharactersUseCase } from '../application/use-cases/characters/find-characters.usecase';
import { UpdateCharacterUseCase } from '../application/use-cases/characters/update-character.usecase';
import { UpdateSkillUseCase } from '../application/use-cases/characters/update-skill.usecase';
import { CreateGameUseCase } from '../application/use-cases/games/create-game-use-case';
import { DeleteGameUseCase } from '../application/use-cases/games/delete-game-use-case';
import { FindGameByIdUseCase } from '../application/use-cases/games/find-game-by-id-use-case';
import { FindGamesUseCase } from '../application/use-cases/games/find-games-use-case';
import { StartRoundUseCase } from '../application/use-cases/games/start-round-use-case';
import { UpdateGameUseCase } from '../application/use-cases/games/update-game-use-case';

import { MongoActionRepository } from '@infrastructure/adapters/outbound/persistence/repositories/mongo-action.repository';
import { MongoCharacterRoundRepository } from '@infrastructure/adapters/outbound/persistence/repositories/mongo-character-round.repository';
import { PinoLogger } from '@infrastructure/logger/pino-logger';
import { ActionController } from '../infrastructure/adapters/inbound/web/controllers/action.controller';
import { AttackController } from '../infrastructure/adapters/inbound/web/controllers/attack.controller';
import { CharacterRoundController } from '../infrastructure/adapters/inbound/web/controllers/character-round.controller';
import { CharacterController } from '../infrastructure/adapters/inbound/web/controllers/character.controller';
import { GameController } from '../infrastructure/adapters/inbound/web/controllers/game.controller';
import { RaceAPICoreClient } from '../infrastructure/adapters/outbound/external/race-api-core-client';
import { SkillAPICoreClient } from '../infrastructure/adapters/outbound/external/skill-api-core-client';
import { SkillCategoryAPICoreClient } from '../infrastructure/adapters/outbound/external/skill-category-api-core-client';

import { TYPES } from './types';

const container = new Container();

container.bind<Logger>(TYPES.Logger).to(PinoLogger).inSingletonScope();

// Repositories
container.bind<ActionRepository>(TYPES.ActionRepository).to(MongoActionRepository).inSingletonScope();
container.bind<CharacterRoundRepository>(TYPES.CharacterRoundRepository).to(MongoCharacterRoundRepository).inSingletonScope();
container.bind<CharacterRoundRepository>(TYPES.CharacterRepository).to(MongoCharacterRoundRepository).inSingletonScope();
container.bind<CharacterRoundRepository>(TYPES.GameRepository).to(MongoCharacterRoundRepository).inSingletonScope();

container.bind<RaceClient>(TYPES.RaceClient).to(RaceAPICoreClient).inSingletonScope();
container.bind<SkillClient>(TYPES.SkillClient).to(SkillAPICoreClient).inSingletonScope();
container.bind<SkillCategoryClient>(TYPES.SkillCategoryClient).to(SkillCategoryAPICoreClient).inSingletonScope();

// Domain services
container.bind<CharacterProcessorService>(TYPES.CharacterProcessorService).to(CharacterProcessorService).inSingletonScope();

// Action use cases
container.bind<CreateActionUseCase>(TYPES.CreateActionUseCase).to(CreateActionUseCase).inSingletonScope();
container.bind<DeleteActionUseCase>(TYPES.DeleteActionUseCase).to(DeleteActionUseCase).inSingletonScope();
container.bind<FindActionByIdUseCase>(TYPES.FindActionByIdUseCase).to(FindActionByIdUseCase).inSingletonScope();
container.bind<FindActionsUseCase>(TYPES.FindActionsUseCase).to(FindActionsUseCase).inSingletonScope();

// Character round use cases
container.bind<FindCharacterRoundsUseCase>(TYPES.FindCharacterRoundsUseCase).to(FindCharacterRoundsUseCase).inSingletonScope();
container.bind<UpdateInitiativeUseCase>(TYPES.UpdateInitiativeUseCase).to(UpdateInitiativeUseCase).inSingletonScope();

// Character use cases
container.bind<AddItemUseCase>(TYPES.AddItemUseCase).to(AddItemUseCase).inSingletonScope();
container.bind<AddSkillUseCase>(TYPES.AddSkillUseCase).to(AddSkillUseCase).inSingletonScope();
container.bind<CreateCharacterUseCase>(TYPES.CreateCharacterUseCase).to(CreateCharacterUseCase).inSingletonScope();
container.bind<DeleteCharacterUseCase>(TYPES.DeleteCharacterUseCase).to(DeleteCharacterUseCase).inSingletonScope();
container.bind<DeleteItemUseCase>(TYPES.DeleteItemUseCase).to(DeleteItemUseCase).inSingletonScope();
container.bind<DeleteSkillUseCase>(TYPES.DeleteSkillUseCase).to(DeleteSkillUseCase).inSingletonScope();
container.bind<EquipItemUseCase>(TYPES.EquipItemUseCase).to(EquipItemUseCase).inSingletonScope();
container.bind<FindTCharacterByIdUseCase>(TYPES.FindTCharacterByIdUseCase).to(FindTCharacterByIdUseCase).inSingletonScope();
container.bind<FindCharactersUseCase>(TYPES.FindCharactersUseCase).to(FindCharactersUseCase).inSingletonScope();
container.bind<UpdateCharacterUseCase>(TYPES.UpdateCharacterUseCase).to(UpdateCharacterUseCase).inSingletonScope();
container.bind<UpdateSkillUseCase>(TYPES.UpdateSkillUseCase).to(UpdateSkillUseCase).inSingletonScope();

// Game use cases
container.bind<CreateGameUseCase>(TYPES.CreateGameUseCase).to(CreateGameUseCase).inSingletonScope();
container.bind<DeleteGameUseCase>(TYPES.DeleteGameUseCase).to(DeleteGameUseCase).inSingletonScope();
container.bind<FindGameByIdUseCase>(TYPES.FindGameByIdUseCase).to(FindGameByIdUseCase).inSingletonScope();
container.bind<FindGamesUseCase>(TYPES.FindGamesUseCase).to(FindGamesUseCase).inSingletonScope();
container.bind<StartRoundUseCase>(TYPES.StartRoundUseCase).to(StartRoundUseCase).inSingletonScope();
container.bind<UpdateGameUseCase>(TYPES.UpdateGameUseCase).to(UpdateGameUseCase).inSingletonScope();

// Controllers
container.bind<ActionController>(TYPES.ActionController).to(ActionController).inSingletonScope();
container.bind<AttackController>(TYPES.AttackController).to(AttackController).inSingletonScope();
container.bind<CharacterRoundController>(TYPES.CharacterRoundController).to(CharacterRoundController).inSingletonScope();
container.bind<CharacterController>(TYPES.CharacterController).to(CharacterController).inSingletonScope();
container.bind<GameController>(TYPES.GameController).to(GameController).inSingletonScope();


export { container };
