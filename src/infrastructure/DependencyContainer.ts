import { Logger } from '../domain/ports/Logger';
import { TacticalCharacterRepository } from '../domain/ports/TacticalCharacterRepository';
import { TacticalGameRepository } from '../domain/ports/TacticalGameRepository';
import { TacticalGameService } from '../domain/services/TacticalGameService';
import { MongoTacticalCharacterRepository } from '../infrastructure/adapters/MongoTacticalCharacterRepository';
import { WinstonLogger } from '../infrastructure/logger/logger';
import { MongoTacticalGameRepository } from '../infrastructure/repositories/MongoTacticalGameRepository';

// Application layer imports
import { TacticalCharacterApplicationService } from '../application/TacticalCharacterApplicationService';
import { TacticalGameApplicationService } from '../application/TacticalGameApplicationService';
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

    // Use Cases
    private readonly _createTacticalGameUseCase!: CreateTacticalGameUseCase;
    private readonly _findTacticalGameByIdUseCase!: FindTacticalGameByIdUseCase;
    private readonly _findTacticalGamesUseCase!: FindTacticalGamesUseCase;
    private readonly _updateTacticalGameUseCase!: UpdateTacticalGameUseCase;
    private readonly _deleteTacticalGameUseCase!: DeleteTacticalGameUseCase;

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
}
