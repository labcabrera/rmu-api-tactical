import { UpdateTacticalGameCommand } from '../../application/commands/UpdateTacticalGameCommand';
import {
    TacticalGame,
    TacticalGameSearchCriteria
} from '../../domain/entities/tactical-game.entity';
import { Logger } from '../../domain/ports/Logger';
import { TacticalGameRepository } from '../../domain/ports/TacticalGameRepository';
import { TacticalGameService } from '../../domain/services/TacticalGameService';

// Mocks
const mockRepository: jest.Mocked<TacticalGameRepository> = {
    findById: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    countBy: jest.fn()
};

const mockLogger: jest.Mocked<Logger> = {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
};

describe('TacticalGameService', () => {
    let service: TacticalGameService;

    beforeEach(() => {
        service = new TacticalGameService(mockRepository, mockLogger);
        jest.clearAllMocks();
    });

    describe('findById', () => {
        it('should return the game when found', async () => {
            const mockGame: TacticalGame = {
                id: '1',
                name: 'Test Game',
                user: 'test@example.com',
                status: 'created',
                factions: ['Light'],
                round: 1
            };

            mockRepository.findById.mockResolvedValue(mockGame);

            const result = await service.findById('1');

            expect(result).toEqual(mockGame);
            expect(mockRepository.findById).toHaveBeenCalledWith('1');
            expect(mockLogger.info).toHaveBeenCalledWith('Finding tactical game by ID: 1');
            expect(mockLogger.info).toHaveBeenCalledWith('Found tactical game: Test Game');
        });

        it('should throw an error when the game is not found', async () => {
            mockRepository.findById.mockResolvedValue(null);

            await expect(service.findById('1')).rejects.toThrow('Tactical game not found');
            expect(mockLogger.error).toHaveBeenCalledWith('Tactical game not found with ID: 1');
        });
    });

    describe('find', () => {
        it('should return a list of games with pagination', async () => {
            const criteria: TacticalGameSearchCriteria = {
                username: 'test@example.com',
                page: 0,
                size: 10
            };

            const mockResponse = {
                content: [{
                    id: '1',
                    name: 'Test Game',
                    user: 'test@example.com',
                    status: 'created' as const,
                    factions: ['Light'],
                    round: 1
                }],
                page: 0,
                size: 10,
                total: 1,
                totalPages: 1
            };

            mockRepository.find.mockResolvedValue(mockResponse);

            const result = await service.find(criteria);

            expect(result).toEqual(mockResponse);
            expect(mockRepository.find).toHaveBeenCalledWith(criteria);
            expect(mockLogger.info).toHaveBeenCalledWith(`Finding tactical games with criteria: ${JSON.stringify(criteria)}`);
            expect(mockLogger.info).toHaveBeenCalledWith('Found 1 tactical games');
        });
    });

    describe('update', () => {
        it('should update an existing game', async () => {
            const existingGame: TacticalGame = {
                id: '1',
                name: 'Existing Game',
                user: 'test@example.com',
                status: 'created',
                factions: ['Light'],
                round: 1
            };

            const command: UpdateTacticalGameCommand = {
                name: 'Updated Game',
                description: 'Updated description'
            };

            const updatedGame: TacticalGame = {
                ...existingGame,
                name: 'Updated Game',
                description: 'Updated description'
            };

            mockRepository.findById.mockResolvedValue(existingGame);
            mockRepository.update.mockResolvedValue(updatedGame);

            const result = await service.update('1', command);

            expect(result).toEqual(updatedGame);
            expect(mockRepository.update).toHaveBeenCalledWith('1', command);
            expect(mockLogger.info).toHaveBeenCalledWith('Updated tactical game: Updated Game');
        });

        it('should throw an error when the game to update is not found', async () => {
            const command: UpdateTacticalGameCommand = {
                name: 'Updated Game'
            };

            mockRepository.findById.mockResolvedValue(null);

            await expect(service.update('1', command)).rejects.toThrow('Tactical game not found');
        });
    });
});
