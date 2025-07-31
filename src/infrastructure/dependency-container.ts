import { Logger } from '../domain/ports/logger';
import { RaceClient } from '../domain/ports/race-client';
import { SkillClient } from '../domain/ports/skill-client';
import { TacticalActionRepository } from '../domain/ports/tactical-action.repository';
import { TacticalCharacterRoundRepository } from '../domain/ports/tactical-character-round.repository';
import { TacticalCharacterRepository } from '../domain/ports/tactical-character.repository';
import { TacticalGameRepository } from '../domain/ports/tactical-game.repository';
import { CharacterProcessorService } from '../domain/services/character-processor.service';

import { UpdateCharacterInitiativeUseCase } from '../application/use-cases/tactical-character-round/update-character-round-initiative-use-case';
import { AddItemUseCase } from '../application/use-cases/tactical-character/add-item-use-case';
import { CreateTacticalCharacterUseCase } from '../application/use-cases/tactical-character/create-tactical-character-use-case';
import { DeleteItemUseCase } from '../application/use-cases/tactical-character/delete-item-use-case';
import { DeleteTacticalCharacterUseCase } from '../application/use-cases/tactical-character/delete-tactical-character-use-case';
import { EquipItemUseCase } from '../application/use-cases/tactical-character/equip-item-use-case';
import { FindTacticalCharacterByIdUseCase } from '../application/use-cases/tactical-character/find-tactical-character-by-id-use-case';
import { FindTacticalCharactersUseCase } from '../application/use-cases/tactical-character/find-tactical-character-use-case';
import { UpdateTacticalCharacterUseCase } from '../application/use-cases/tactical-character/update-tactical-character-use-case';
import { CreateTacticalGameUseCase } from '../application/use-cases/tactical-game/create-tactical-game-use-case';
import { DeleteTacticalGameUseCase } from '../application/use-cases/tactical-game/delete-tactical-game-use-case';
import { FindTacticalGameByIdUseCase } from '../application/use-cases/tactical-game/find-tactical-game-by-id-use-case';
import { FindTacticalGamesUseCase } from '../application/use-cases/tactical-game/find-tactical-games-use-case';
import { StartRoundUseCase } from '../application/use-cases/tactical-game/start-round-use-case';
import { UpdateTacticalGameUseCase } from '../application/use-cases/tactical-game/update-tactical-game-use-case';

import { AddSkillUseCase } from '../application/use-cases/tactical-character/add-skill-use-case';
import { DeleteSkillUseCase } from '../application/use-cases/tactical-character/delete-skill-use-case';
import { UpdateSkillUseCase } from '../application/use-cases/tactical-character/update-skill-use-case';
import { SkillCategoryClient } from '../domain/ports/skill-category-client';
import { RaceAPICoreClient } from './adapters/external/race-api-core-client';
import { SkillAPICoreClient } from './adapters/external/skill-api-core-client';
import { SkillCategoryAPICoreClient } from './adapters/external/skill-category-api-core-client';
import { MongoTacticalActionRepository } from './adapters/persistence/repositories/mongo-tactical-action.repository';
import { MongoTacticalCharacterRoundRepository } from './adapters/persistence/repositories/mongo-tactical-character-round.repository';
import { MongoTacticalCharacterRepository } from './adapters/persistence/repositories/mongo-tactical-character.repository';
import { MongoTacticalGameRepository } from './adapters/persistence/repositories/mongo-tactical-game.repository';
import { WinstonLogger } from './logger/logger';

export class DependencyContainer {
    private static instance: DependencyContainer;

    private readonly _logger: Logger;
    private readonly _tacticalActionRepository: TacticalActionRepository;
    private readonly _tacticalGameRepository: TacticalGameRepository;
    private readonly _tacticalCharacterRepository: TacticalCharacterRepository;
    private readonly _tacticalCharacterRoundRepository: TacticalCharacterRoundRepository;
    private readonly _characterProcessorService: CharacterProcessorService;

    private readonly _raceClient: RaceClient;
    private readonly _skillClient: SkillClient;
    private readonly _skillCategoryClient: SkillCategoryClient;

    // Tactical Game Use Cases
    private readonly _createTacticalGameUseCase!: CreateTacticalGameUseCase;
    private readonly _findTacticalGameByIdUseCase!: FindTacticalGameByIdUseCase;
    private readonly _findTacticalGamesUseCase!: FindTacticalGamesUseCase;
    private readonly _updateTacticalGameUseCase!: UpdateTacticalGameUseCase;
    private readonly _deleteTacticalGameUseCase!: DeleteTacticalGameUseCase;
    private readonly _startRoundUseCase!: StartRoundUseCase;

    // Tactical Character Use Cases
    private readonly _findTacticalCharacterUseCase!: FindTacticalCharactersUseCase;
    private readonly _findTacticalCharacterByIdUseCase!: FindTacticalCharacterByIdUseCase;
    private readonly _createTacticalCharacterUseCase: CreateTacticalCharacterUseCase;
    private readonly _updateTacticalCharacterUseCase: UpdateTacticalCharacterUseCase;
    private readonly _deleteTacticalCharacterUseCase: DeleteTacticalCharacterUseCase;
    private readonly _updateCharacterInitiativeUseCase: UpdateCharacterInitiativeUseCase;
    private readonly _addItemUseCase!: AddItemUseCase;
    private readonly _deleteItemUseCase: DeleteItemUseCase;
    private readonly _equipItemUseCase: EquipItemUseCase;
    private readonly _addSkillUseCase!: AddSkillUseCase;
    private readonly _updateSkillUseCase!: UpdateSkillUseCase;
    private readonly _deleteSkillUseCase!: DeleteSkillUseCase;
    
    private constructor() {
        // Configure basic dependencies
        this._logger = new WinstonLogger();
        this._tacticalActionRepository = new MongoTacticalActionRepository();
        this._tacticalGameRepository = new MongoTacticalGameRepository();
        this._tacticalCharacterRepository = new MongoTacticalCharacterRepository();
        this._tacticalCharacterRoundRepository = new MongoTacticalCharacterRoundRepository();
        this._characterProcessorService = new CharacterProcessorService(this._logger);

        this._raceClient = new RaceAPICoreClient(this._logger);
        this._skillClient = new SkillAPICoreClient(this._logger);
        this._skillCategoryClient = new SkillCategoryAPICoreClient(this._logger);

        // Configure use cases
        this._createTacticalGameUseCase = new CreateTacticalGameUseCase(
            this._tacticalGameRepository,
            this._logger
        );

        this._findTacticalGameByIdUseCase = new FindTacticalGameByIdUseCase(
            this._tacticalGameRepository,
            this._logger
        );

        this._findTacticalGamesUseCase = new FindTacticalGamesUseCase(
            this._tacticalGameRepository,
            this._logger
        );

        this._updateTacticalGameUseCase = new UpdateTacticalGameUseCase(
            this._tacticalGameRepository,
            this._logger,
        );

        this._deleteTacticalGameUseCase = new DeleteTacticalGameUseCase(
            this._tacticalGameRepository,
            this._tacticalCharacterRepository,
            this._logger,
        );

        this._startRoundUseCase = new StartRoundUseCase(
            this._tacticalGameRepository,
            this._tacticalCharacterRepository,
            this._tacticalCharacterRoundRepository,
            this._logger
        );

        // Configure tactical character use cases
        this._findTacticalCharacterByIdUseCase = new FindTacticalCharacterByIdUseCase(
            this._tacticalCharacterRepository,
            this._logger
        );
        this._findTacticalCharacterUseCase = new FindTacticalCharactersUseCase(
            this._tacticalCharacterRepository,
            this._logger
        );   
        this._createTacticalCharacterUseCase = new CreateTacticalCharacterUseCase(
            this._raceClient,
            this._skillClient,
            this._tacticalCharacterRepository,
            this._tacticalGameRepository,
            this._characterProcessorService,
            this._logger
        );
        this._updateTacticalCharacterUseCase = new UpdateTacticalCharacterUseCase(
            this._tacticalCharacterRepository,
            this._logger
        );
        this._deleteTacticalCharacterUseCase = new DeleteTacticalCharacterUseCase(
            this._tacticalCharacterRepository,
            this._logger
        );
        this._updateCharacterInitiativeUseCase = new UpdateCharacterInitiativeUseCase(
            this._tacticalCharacterRoundRepository,
            this._logger
        );
        this._addItemUseCase = new AddItemUseCase(
            this._tacticalCharacterRepository,
            this._logger
        );
        this._deleteItemUseCase = new DeleteItemUseCase(
            this._tacticalCharacterRepository,
            this._logger
        );
        this._equipItemUseCase = new EquipItemUseCase(
            this._tacticalCharacterRepository,
            this._characterProcessorService,
            this._logger
        );
        this._addSkillUseCase = new AddSkillUseCase(
            this._characterProcessorService,
            this._tacticalCharacterRepository,
            this._skillClient,
            this._skillCategoryClient,
            this._logger
        );
        this._updateSkillUseCase = new UpdateSkillUseCase(
            this._characterProcessorService,
            this._tacticalCharacterRepository,
            this._logger
        );
        this._deleteSkillUseCase = new DeleteSkillUseCase(
            this._characterProcessorService,
            this._tacticalCharacterRepository,
            this._logger
        );
    }

    public static getInstance(): DependencyContainer {
        if (!DependencyContainer.instance) {
            DependencyContainer.instance = new DependencyContainer();
        }
        return DependencyContainer.instance;
    }

    get logger(): Logger {
        return this._logger;
    }

    get tacticalGameRepository(): TacticalGameRepository {
        return this._tacticalGameRepository;
    }

    get tacticalActionRepository(): TacticalActionRepository {
        return this._tacticalActionRepository;
    }

    get tacticalCharacterRepository(): TacticalCharacterRepository {
        return this._tacticalCharacterRepository;
    }

    get characterProcessorService(): CharacterProcessorService {
        return this._characterProcessorService;
    }

    // Use Case getters
    get createTacticalGameUseCase(): CreateTacticalGameUseCase {
        return this._createTacticalGameUseCase;
    }

    get findTacticalGameByIdUseCase(): FindTacticalGameByIdUseCase {
        return this._findTacticalGameByIdUseCase;
    }

    get findTacticalGamesUseCase(): FindTacticalGamesUseCase {
        return this._findTacticalGamesUseCase;
    }

    get updateTacticalGameUseCase(): UpdateTacticalGameUseCase {
        return this._updateTacticalGameUseCase;
    }

    get deleteTacticalGameUseCase(): DeleteTacticalGameUseCase {
        return this._deleteTacticalGameUseCase;
    }

    get startRoundUseCase(): StartRoundUseCase {
        return this._startRoundUseCase;
    }

    // Tactical Character Use Case getters
    get findTacticalCharacterByIdUseCase(): FindTacticalCharacterByIdUseCase {
        return this._findTacticalCharacterByIdUseCase;
    }

    get createTacticalCharacterUseCase(): CreateTacticalCharacterUseCase {
        return this._createTacticalCharacterUseCase;
    }

    get updateTacticalCharacterUseCase(): UpdateTacticalCharacterUseCase {
        return this._updateTacticalCharacterUseCase;
    }

    get deleteTacticalCharacterUseCase(): DeleteTacticalCharacterUseCase {
        return this._deleteTacticalCharacterUseCase;
    }

    get updateCharacterInitiativeUseCase(): UpdateCharacterInitiativeUseCase {
        return this._updateCharacterInitiativeUseCase;
    }

    get characterEquipItemUseCase(): EquipItemUseCase {
        return this._equipItemUseCase;
    }

    get findTacticalCharacterUseCase(): FindTacticalCharactersUseCase {
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
}
