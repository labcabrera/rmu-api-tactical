import { Logger } from '../domain/ports/Logger';
import { TacticalCharacterRepository } from '../domain/ports/TacticalCharacterRepository';
import { TacticalGameRepository } from '../domain/ports/TacticalGameRepository';
import { CharacterProcessorService } from '../domain/services/CharacterProcessorService';
import { TacticalGameService } from '../domain/services/TacticalGameService';
import { MongoTacticalCharacterRepository } from '../infrastructure/adapters/persistence/MongoTacticalCharacterRepository';
import { MongoTacticalGameRepository } from '../infrastructure/adapters/persistence/MongoTacticalGameRepository';
import { WinstonLogger } from '../infrastructure/logger/logger';

// Application layer imports
import { TacticalCharacterApplicationService } from '../application/TacticalCharacterApplicationService';
import { TacticalGameApplicationService } from '../application/TacticalGameApplicationService';
import { CreateTacticalCharacterUseCase } from '../application/use-cases/tactical-character/CreateTacticalCharacterUseCase';
import { DeleteTacticalCharacterUseCase } from '../application/use-cases/tactical-character/DeleteTacticalCharacterUseCase';
import { UpdateTacticalCharacterUseCase } from '../application/use-cases/tactical-character/UpdateTacticalCharacterUseCase';
import { CreateTacticalGameUseCase } from '../application/use-cases/tactical-game/CreateTacticalGameUseCase';
import { DeleteTacticalGameUseCase } from '../application/use-cases/tactical-game/DeleteTacticalGameUseCase';
import { FindTacticalGameByIdUseCase } from '../application/use-cases/tactical-game/FindTacticalGameByIdUseCase';
import { FindTacticalGamesUseCase } from '../application/use-cases/tactical-game/FindTacticalGamesUseCase';
import { UpdateTacticalGameUseCase } from '../application/use-cases/tactical-game/UpdateTacticalGameUseCase';

// Configuración de dependencias
export class DependencyContainer {
    private static instance: DependencyContainer;

    private readonly _logger: Logger;
    private readonly _tacticalGameRepository: TacticalGameRepository;
    private readonly _tacticalCharacterRepository: TacticalCharacterRepository;
    private readonly _tacticalGameService: TacticalGameService;
    private readonly _characterProcessorService: CharacterProcessorService;

    // Use Cases
    private readonly _createTacticalGameUseCase!: CreateTacticalGameUseCase;
    private readonly _findTacticalGameByIdUseCase!: FindTacticalGameByIdUseCase;
    private readonly _findTacticalGamesUseCase!: FindTacticalGamesUseCase;
    private readonly _updateTacticalGameUseCase!: UpdateTacticalGameUseCase;
    private readonly _deleteTacticalGameUseCase!: DeleteTacticalGameUseCase;

    private readonly _createTacticalCharacterUseCase!: CreateTacticalCharacterUseCase;
    private readonly _updateTacticalCharacterUseCase!: UpdateTacticalCharacterUseCase;
    private readonly _deleteTacticalCharacterUseCase!: DeleteTacticalCharacterUseCase;

    // Application Services
    private readonly _tacticalGameApplicationService!: TacticalGameApplicationService;
    private readonly _tacticalCharacterApplicationService!: TacticalCharacterApplicationService;

    private constructor() {
        // Configure basic dependencies
        this._logger = new WinstonLogger();
        this._tacticalGameRepository = new MongoTacticalGameRepository();
        this._tacticalCharacterRepository = new MongoTacticalCharacterRepository();
        this._tacticalGameService = new TacticalGameService(
            this._tacticalGameRepository,
            this._logger
        );
        this._characterProcessorService = new CharacterProcessorService(this._logger);

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
            this._findTacticalGameByIdUseCase
        );

        this._deleteTacticalGameUseCase = new DeleteTacticalGameUseCase(
            this._tacticalGameRepository,
            this._logger,
            this._findTacticalGameByIdUseCase
        );

        // Configure tactical character use cases
        this._createTacticalCharacterUseCase = new CreateTacticalCharacterUseCase(
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

        // Configure application services
        this._tacticalGameApplicationService = new TacticalGameApplicationService(
            this._createTacticalGameUseCase,
            this._findTacticalGameByIdUseCase,
            this._findTacticalGamesUseCase,
            this._updateTacticalGameUseCase,
            this._deleteTacticalGameUseCase
        );

        this._tacticalCharacterApplicationService = new TacticalCharacterApplicationService(
            this._tacticalCharacterRepository,
            this._tacticalGameRepository,
            this._characterProcessorService,
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

    get tacticalCharacterRepository(): TacticalCharacterRepository {
        return this._tacticalCharacterRepository;
    }

    get tacticalGameService(): TacticalGameService {
        return this._tacticalGameService;
    }

    get characterProcessorService(): CharacterProcessorService {
        return this._characterProcessorService;
    }

    get tacticalGameApplicationService(): TacticalGameApplicationService {
        return this._tacticalGameApplicationService;
    }

    get tacticalCharacterApplicationService(): TacticalCharacterApplicationService {
        return this._tacticalCharacterApplicationService;
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

    // Tactical Character Use Case getters
    get createTacticalCharacterUseCase(): CreateTacticalCharacterUseCase {
        return this._createTacticalCharacterUseCase;
    }

    get updateTacticalCharacterUseCase(): UpdateTacticalCharacterUseCase {
        return this._updateTacticalCharacterUseCase;
    }

    get deleteTacticalCharacterUseCase(): DeleteTacticalCharacterUseCase {
        return this._deleteTacticalCharacterUseCase;
    }
}
