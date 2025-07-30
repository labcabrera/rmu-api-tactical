import tacticalGameConverter from '../converters/tactical-game-converter';
import TacticalGame from '../models/tactical-game-model';
import tacticalGameService from '../services/tactical-game-service';
import { ITacticalGame } from '../types';

jest.mock('../models/tactical-game-model');
jest.mock('../converters/tactical-game-converter');

const mockTacticalGame = TacticalGame as jest.Mocked<typeof TacticalGame>;
const mockConverter = tacticalGameConverter as jest.Mocked<typeof tacticalGameConverter>;

describe('TacticalGameService', () => {
    describe('findById', () => {
        it('should return the game when found', async () => {
            const mockGame = {
                _id: '1',
                name: 'Test Game',
                round: 1,
                factions: ['Light'],
                user: 'test@example.com'
            } as unknown as ITacticalGame;

            const convertedGame = {
                id: '1',
                name: 'Test Game',
                round: 1,
                factions: ['Light'],
                user: 'test@example.com'
            };

            mockTacticalGame.findById = jest.fn().mockResolvedValue(mockGame);
            mockConverter.toJSON = jest.fn().mockReturnValue(convertedGame);

            const result = await tacticalGameService.findById('1');
            expect(result).toEqual(convertedGame);
            expect(mockConverter.toJSON).toHaveBeenCalledWith(mockGame);
        });

        it('should throw an error when the game is not found', async () => {
            mockTacticalGame.findById = jest.fn().mockResolvedValue(null);

            await expect(tacticalGameService.findById('1')).rejects.toThrow('Tactical game not found');
        });
    });

    describe('find', () => {
        it('should return a list of games with pagination', async () => {
            const mockGame = {
                _id: '1',
                name: 'Test Game',
                round: 1,
                factions: ['Light'],
                user: 'test@example.com'
            } as unknown as ITacticalGame;

            const convertedGame = {
                id: '1',
                name: 'Test Game',
                round: 1,
                factions: ['Light'],
                user: 'test@example.com'
            };

            const mockGames = [mockGame];
            const mockFind = {
                skip: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                sort: jest.fn().mockResolvedValue(mockGames)
            };

            mockTacticalGame.find = jest.fn().mockReturnValue(mockFind);
            mockTacticalGame.countDocuments = jest.fn().mockResolvedValue(1);
            mockConverter.toJSON = jest.fn().mockReturnValue(convertedGame);

            const result = await tacticalGameService.find(undefined, 'user1', 0, 10);
            expect(result).toEqual({
                content: [convertedGame],
                page: 0,
                size: 10,
                total: 1,
                totalPages: 1
            });
            expect(mockConverter.toJSON).toHaveBeenCalledWith(mockGame, 0, [mockGame]);
        });
    });

    describe('insert', () => {
        it('should insert a new game and return it', async () => {
            const gameData = { name: 'New Game', description: 'Test Description' };
            const mockSavedGame = {
                _id: '1',
                name: 'New Game',
                user: 'test@example.com',
                description: 'Test Description',
                round: 0,
                factions: ['Light', 'Evil', 'Neutral'],
                save: jest.fn().mockResolvedValue({
                    _id: '1',
                    name: 'New Game',
                    user: 'test@example.com',
                    description: 'Test Description',
                    round: 0,
                    factions: ['Light', 'Evil', 'Neutral']
                })
            } as unknown as ITacticalGame;

            const convertedGame = {
                id: '1',
                name: 'New Game',
                user: 'test@example.com',
                description: 'Test Description',
                round: 0,
                factions: ['Light', 'Evil', 'Neutral']
            };

            // Mock the constructor
            (mockTacticalGame as any).mockImplementation(() => mockSavedGame);
            mockConverter.toJSON = jest.fn().mockReturnValue(convertedGame);

            const result = await tacticalGameService.insert('test@example.com', gameData);
            expect(result).toEqual(convertedGame);
            expect(mockConverter.toJSON).toHaveBeenCalled();
        });
    });
});
