import { Logger } from '../domain/ports/Logger';
import { TacticalGameRepository } from '../domain/ports/TacticalGameRepository';
import { TacticalGameService } from '../domain/services/TacticalGameService';
import { WinstonLogger } from '../infrastructure/logger/logger';
import { MongoTacticalGameRepository } from '../infrastructure/repositories/MongoTacticalGameRepository';

// Application layer imports
import { TacticalGameApplicationService } from '../application/TacticalGameApplicationService';
import { CreateTacticalGameUseCase } from '../application/use-cases/CreateTacticalGameUseCase';
import { DeleteTacticalGameUseCase } from '../application/use-cases/DeleteTacticalGameUseCase';
import { FindTacticalGameByIdUseCase } from '../application/use-cases/FindTacticalGameByIdUseCase';
import { FindTacticalGamesUseCase } from '../application/use-cases/FindTacticalGamesUseCase';
import { UpdateTacticalGameUseCase } from '../application/use-cases/UpdateTacticalGameUseCase';

// Configuración de dependencias
export class DependencyContainer {
    private static instance: DependencyContainer;

    private readonly _logger: Logger;
    private readonly _tacticalGameRepository: TacticalGameRepository;
    private readonly _tacticalGameService: TacticalGameService;

    // Use Cases
    private readonly _createTacticalGameUseCase!: CreateTacticalGameUseCase;
    private readonly _findTacticalGameByIdUseCase!: FindTacticalGameByIdUseCase;
    private readonly _findTacticalGamesUseCase!: FindTacticalGamesUseCase;
    private readonly _updateTacticalGameUseCase!: UpdateTacticalGameUseCase;
    private readonly _deleteTacticalGameUseCase!: DeleteTacticalGameUseCase;

    // Application Service
    private readonly _tacticalGameApplicationService!: TacticalGameApplicationService;

    private constructor() {
        // Configurar dependencias básicas
        this._logger = new WinstonLogger();
        this._tacticalGameRepository = new MongoTacticalGameRepository();
        this._tacticalGameService = new TacticalGameService(
            this._tacticalGameRepository,
            this._logger
        );

        // Configurar casos de uso
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

        // Configurar servicio de aplicación
        this._tacticalGameApplicationService = new TacticalGameApplicationService(
            this._createTacticalGameUseCase,
            this._findTacticalGameByIdUseCase,
            this._findTacticalGamesUseCase,
            this._updateTacticalGameUseCase,
            this._deleteTacticalGameUseCase
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

    get tacticalGameService(): TacticalGameService {
        return this._tacticalGameService;
    }

    get tacticalGameApplicationService(): TacticalGameApplicationService {
        return this._tacticalGameApplicationService;
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
