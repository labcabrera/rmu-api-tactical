import { Logger } from '../domain/ports/Logger';
import { TacticalGameRepository } from '../domain/ports/TacticalGameRepository';
import { TacticalGameService } from '../domain/services/TacticalGameService';
import { WinstonLogger } from '../infrastructure/logger/logger';
import { MongoTacticalGameRepository } from '../infrastructure/repositories/MongoTacticalGameRepository';

// Configuración de dependencias
export class DependencyContainer {
    private static instance: DependencyContainer;

    private readonly _logger: Logger;
    private readonly _tacticalGameRepository: TacticalGameRepository;
    private readonly _tacticalGameService: TacticalGameService;

    private constructor() {
        // Configurar dependencias
        this._logger = new WinstonLogger();
        this._tacticalGameRepository = new MongoTacticalGameRepository();
        this._tacticalGameService = new TacticalGameService(
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

    get tacticalGameService(): TacticalGameService {
        return this._tacticalGameService;
    }
}
