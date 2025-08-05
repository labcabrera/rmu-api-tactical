import { Configuration } from "../domain/ports/configuration";
import { Logger } from "../domain/ports/logger";
import { ActionRepository } from "../domain/ports/outbound/action.repository";
import { AuthTokenService } from "../domain/ports/outbound/auth-token-service";
import { CharacterRoundRepository } from "../domain/ports/outbound/character-round.repository";
import { CharacterRepository } from "../domain/ports/outbound/character.repository";
import { GameRepository } from "../domain/ports/outbound/game.repository";
import { RaceClient } from "../domain/ports/outbound/race-client";
import { SkillClient } from "../domain/ports/outbound/skill-client";
import { CharacterProcessorService } from "../domain/services/character-processor.service";

import { UpdateCharacterInitiativeUseCase } from "../application/use-cases/character-rounds/update-initiative.usecase";
import { AddItemUseCase } from "../application/use-cases/characters/add-item.usecase";
import { CreateCharacterUseCase } from "../application/use-cases/characters/create-character.usecase";
import { DeleteCharacterUseCase } from "../application/use-cases/characters/delete-character.usecase";
import { DeleteItemUseCase } from "../application/use-cases/characters/delete-item.usecase";
import { EquipItemUseCase } from "../application/use-cases/characters/equip-item.usecase";
import { FindTCharacterByIdUseCase } from "../application/use-cases/characters/find-character-by-id.usecase";
import { FindCharactersUseCase } from "../application/use-cases/characters/find-characters.usecase";
import { UpdateCharacterUseCase } from "../application/use-cases/characters/update-character.usecase";
import { CreateGameUseCase } from "../application/use-cases/games/create-game-use-case";
import { DeleteGameUseCase } from "../application/use-cases/games/delete-game-use-case";
import { FindGameByIdUseCase } from "../application/use-cases/games/find-game-by-id-use-case";
import { FindGamesUseCase } from "../application/use-cases/games/find-games-use-case";
import { StartRoundUseCase } from "../application/use-cases/games/start-round-use-case";
import { UpdateGameUseCase } from "../application/use-cases/games/update-game-use-case";

import { CreateActionUseCase } from "../application/use-cases/actions/create-action.usecase";
import { DeleteActionUseCase } from "../application/use-cases/actions/delete-action.usecase";
import { FindActionByIdUseCase } from "../application/use-cases/actions/find-action-by-id.usecase";
import { FindActionsUseCase } from "../application/use-cases/actions/find-actions.usecase";
import { FindCharacterRoundsUseCase } from "../application/use-cases/character-rounds/find-character-rounds.usecase";
import { AddSkillUseCase } from "../application/use-cases/characters/add-skill.usecase";
import { DeleteSkillUseCase } from "../application/use-cases/characters/delete-skill.usecase";
import { UpdateSkillUseCase } from "../application/use-cases/characters/update-skill.usecase";
import { SkillCategoryClient } from "../domain/ports/outbound/skill-category-client";
import { OAuth2TokenService } from "./adapters/auth/oauth2-token-service";
import { EnvironmentConfiguration } from "./adapters/config/environment-configuration";
import { RaceAPICoreClient } from "./adapters/external/race-api-core-client";
import { SkillAPICoreClient } from "./adapters/external/skill-api-core-client";
import { SkillCategoryAPICoreClient } from "./adapters/external/skill-category-api-core-client";
import { MongoActionRepository } from "./adapters/persistence/repositories/mongo-action.repository";
import { MongoCharacterRoundRepository } from "./adapters/persistence/repositories/mongo-character-round.repository";
import { MongoTacticalCharacterRepository } from "./adapters/persistence/repositories/mongo-character.repository";
import { MongoTacticalGameRepository } from "./adapters/persistence/repositories/mongo-game.repository";
import { WinstonLogger } from "./logger/logger";

export class DependencyContainer {
  private static instance: DependencyContainer;

  private readonly _configuration: Configuration;
  private readonly _logger: Logger;
  private readonly _authTokenService: AuthTokenService;
  private readonly _tacticalActionRepository: ActionRepository;
  private readonly _tacticalGameRepository: GameRepository;
  private readonly _tacticalCharacterRepository: CharacterRepository;
  private readonly _tacticalCharacterRoundRepository: CharacterRoundRepository;
  private readonly _characterProcessorService: CharacterProcessorService;

  private readonly _raceClient: RaceClient;
  private readonly _skillClient: SkillClient;
  private readonly _skillCategoryClient: SkillCategoryClient;

  // Tactical game use cases
  private readonly _createTacticalGameUseCase!: CreateGameUseCase;
  private readonly _findTacticalGameByIdUseCase!: FindGameByIdUseCase;
  private readonly _findTacticalGamesUseCase!: FindGamesUseCase;
  private readonly _updateTacticalGameUseCase!: UpdateGameUseCase;
  private readonly _deleteTacticalGameUseCase!: DeleteGameUseCase;
  private readonly _startRoundUseCase!: StartRoundUseCase;

  // Tactical character use cases
  private readonly _findTacticalCharacterUseCase!: FindCharactersUseCase;
  private readonly _findTacticalCharacterByIdUseCase!: FindTCharacterByIdUseCase;
  private readonly _createTacticalCharacterUseCase: CreateCharacterUseCase;
  private readonly _updateTacticalCharacterUseCase: UpdateCharacterUseCase;
  private readonly _deleteTacticalCharacterUseCase: DeleteCharacterUseCase;
  private readonly _addItemUseCase!: AddItemUseCase;
  private readonly _deleteItemUseCase: DeleteItemUseCase;
  private readonly _equipItemUseCase: EquipItemUseCase;
  private readonly _addSkillUseCase!: AddSkillUseCase;
  private readonly _updateSkillUseCase!: UpdateSkillUseCase;
  private readonly _deleteSkillUseCase!: DeleteSkillUseCase;

  // Tactical character round use cases
  private readonly _findTacticalCharacterRoundsUseCase!: FindCharacterRoundsUseCase;
  private readonly _updateCharacterInitiativeUseCase: UpdateCharacterInitiativeUseCase;

  // Action use cases
  private readonly _findActionByIdUseCase!: FindActionByIdUseCase;
  private readonly _findActionsUseCase!: FindActionsUseCase;
  private readonly _createActionUseCase!: CreateActionUseCase;
  private readonly _deleteActionUseCase!: DeleteActionUseCase;

  private constructor() {
    // Configure basic dependencies
    this._configuration = new EnvironmentConfiguration();
    this._logger = new WinstonLogger();
    this._authTokenService = new OAuth2TokenService(
      this._configuration,
      this._logger,
    );
    this._tacticalActionRepository = new MongoActionRepository();
    this._tacticalGameRepository = new MongoTacticalGameRepository();
    this._tacticalCharacterRepository = new MongoTacticalCharacterRepository();
    this._tacticalCharacterRoundRepository =
      new MongoCharacterRoundRepository();
    this._characterProcessorService = new CharacterProcessorService(
      this._logger,
    );

    this._raceClient = new RaceAPICoreClient(
      this._logger,
      this._configuration,
      this._authTokenService,
    );
    this._skillClient = new SkillAPICoreClient(
      this._logger,
      this._configuration,
      this._authTokenService,
    );
    this._skillCategoryClient = new SkillCategoryAPICoreClient(
      this._logger,
      this._configuration,
      this._authTokenService,
    );

    // Configure tactical game use cases
    this._createTacticalGameUseCase = new CreateGameUseCase(
      this._tacticalGameRepository,
      this._logger,
    );

    this._findTacticalGameByIdUseCase = new FindGameByIdUseCase(
      this._tacticalGameRepository,
    );

    this._findTacticalGamesUseCase = new FindGamesUseCase(
      this._tacticalGameRepository,
    );

    this._updateTacticalGameUseCase = new UpdateGameUseCase(
      this._tacticalGameRepository,
      this._logger,
    );

    this._deleteTacticalGameUseCase = new DeleteGameUseCase(
      this._tacticalGameRepository,
      this._tacticalCharacterRepository,
      this._logger,
    );

    this._startRoundUseCase = new StartRoundUseCase(
      this._tacticalGameRepository,
      this._tacticalCharacterRepository,
      this._tacticalCharacterRoundRepository,
      this._logger,
    );

    // Configure tactical character use cases
    this._findTacticalCharacterByIdUseCase = new FindTCharacterByIdUseCase(
      this._tacticalCharacterRepository,
      this._logger,
    );
    this._findTacticalCharacterUseCase = new FindCharactersUseCase(
      this._tacticalCharacterRepository,
      this._logger,
    );
    this._createTacticalCharacterUseCase = new CreateCharacterUseCase(
      this._raceClient,
      this._skillClient,
      this._tacticalCharacterRepository,
      this._tacticalGameRepository,
      this._characterProcessorService,
      this._logger,
    );
    this._updateTacticalCharacterUseCase = new UpdateCharacterUseCase(
      this._characterProcessorService,
      this._tacticalCharacterRepository,
      this._logger,
    );
    this._deleteTacticalCharacterUseCase = new DeleteCharacterUseCase(
      this._tacticalCharacterRepository,
      this._logger,
    );
    this._updateCharacterInitiativeUseCase =
      new UpdateCharacterInitiativeUseCase(
        this._tacticalCharacterRoundRepository,
        this._logger,
      );
    this._addItemUseCase = new AddItemUseCase(
      this._characterProcessorService,
      this._tacticalCharacterRepository,
      this._logger,
    );
    this._deleteItemUseCase = new DeleteItemUseCase(
      this._tacticalCharacterRepository,
      this._logger,
    );
    this._equipItemUseCase = new EquipItemUseCase(
      this._tacticalCharacterRepository,
      this._characterProcessorService,
      this._logger,
    );
    this._addSkillUseCase = new AddSkillUseCase(
      this._characterProcessorService,
      this._tacticalCharacterRepository,
      this._skillClient,
      this._skillCategoryClient,
      this._logger,
    );
    this._updateSkillUseCase = new UpdateSkillUseCase(
      this._characterProcessorService,
      this._tacticalCharacterRepository,
      this._logger,
    );
    this._deleteSkillUseCase = new DeleteSkillUseCase(
      this._characterProcessorService,
      this._tacticalCharacterRepository,
      this._logger,
    );
    // Configure tactical character round use cases
    this._findTacticalCharacterRoundsUseCase = new FindCharacterRoundsUseCase(
      this._tacticalCharacterRoundRepository,
      this._logger,
    );
    // Configure action use cases
    this._findActionByIdUseCase = new FindActionByIdUseCase(
      this._tacticalActionRepository,
      this._logger,
    );
    this._findActionsUseCase = new FindActionsUseCase(
      this._tacticalActionRepository,
      this._logger,
    );
    this._createActionUseCase = new CreateActionUseCase(
      this._tacticalGameRepository,
      this._tacticalCharacterRepository,
      this._tacticalCharacterRoundRepository,
      this._tacticalActionRepository,
      this._logger,
    );
    this._deleteActionUseCase = new DeleteActionUseCase(
      this._tacticalActionRepository,
      this._logger,
    );
  }

  public static getInstance(): DependencyContainer {
    if (!DependencyContainer.instance) {
      DependencyContainer.instance = new DependencyContainer();
    }
    return DependencyContainer.instance;
  }

  get configuration(): Configuration {
    return this._configuration;
  }

  get authTokenService(): AuthTokenService {
    return this._authTokenService;
  }

  get logger(): Logger {
    return this._logger;
  }

  get tacticalGameRepository(): GameRepository {
    return this._tacticalGameRepository;
  }

  get tacticalActionRepository(): ActionRepository {
    return this._tacticalActionRepository;
  }

  get tacticalCharacterRepository(): CharacterRepository {
    return this._tacticalCharacterRepository;
  }

  get characterProcessorService(): CharacterProcessorService {
    return this._characterProcessorService;
  }

  // Use Case getters
  get createTacticalGameUseCase(): CreateGameUseCase {
    return this._createTacticalGameUseCase;
  }

  get findTacticalGameByIdUseCase(): FindGameByIdUseCase {
    return this._findTacticalGameByIdUseCase;
  }

  get findTacticalGamesUseCase(): FindGamesUseCase {
    return this._findTacticalGamesUseCase;
  }

  get updateTacticalGameUseCase(): UpdateGameUseCase {
    return this._updateTacticalGameUseCase;
  }

  get deleteTacticalGameUseCase(): DeleteGameUseCase {
    return this._deleteTacticalGameUseCase;
  }

  get startRoundUseCase(): StartRoundUseCase {
    return this._startRoundUseCase;
  }

  // Tactical Character Use Case getters
  get findTacticalCharacterByIdUseCase(): FindTCharacterByIdUseCase {
    return this._findTacticalCharacterByIdUseCase;
  }

  get createTacticalCharacterUseCase(): CreateCharacterUseCase {
    return this._createTacticalCharacterUseCase;
  }

  get updateTacticalCharacterUseCase(): UpdateCharacterUseCase {
    return this._updateTacticalCharacterUseCase;
  }

  get deleteTacticalCharacterUseCase(): DeleteCharacterUseCase {
    return this._deleteTacticalCharacterUseCase;
  }

  get updateCharacterInitiativeUseCase(): UpdateCharacterInitiativeUseCase {
    return this._updateCharacterInitiativeUseCase;
  }

  get characterEquipItemUseCase(): EquipItemUseCase {
    return this._equipItemUseCase;
  }

  get findTacticalCharacterUseCase(): FindCharactersUseCase {
    return this._findTacticalCharacterUseCase;
  }

  get addItemUseCase(): AddItemUseCase {
    return this._addItemUseCase;
  }

  get deleteItemUseCase(): DeleteItemUseCase {
    return this._deleteItemUseCase;
  }

  get equipItemUseCase(): EquipItemUseCase {
    return this._equipItemUseCase;
  }

  get addSkillUseCase(): AddSkillUseCase {
    return this._addSkillUseCase;
  }

  get updateSkillUseCase(): UpdateSkillUseCase {
    return this._updateSkillUseCase;
  }

  get deleteSkillUseCase(): DeleteSkillUseCase {
    return this._deleteSkillUseCase;
  }

  // Tactical character round use case getters
  get findTacticalCharacterRoundsUseCase(): FindCharacterRoundsUseCase {
    return this._findTacticalCharacterRoundsUseCase;
  }

  // Action use case getters
  get findActionByIdUseCase(): FindActionByIdUseCase {
    return this._findActionByIdUseCase;
  }

  get findActionsUseCase(): FindActionsUseCase {
    return this._findActionsUseCase;
  }

  get createActionUseCase(): CreateActionUseCase {
    return this._createActionUseCase;
  }
  get deleteActionUseCase(): DeleteActionUseCase {
    return this._deleteActionUseCase;
  }
}
