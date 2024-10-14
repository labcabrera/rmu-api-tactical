const TacticalGame = require('../models/tactical-game-model');
const tacticalGameConverter = require('../converters/tactical-game-converter');
const tacticalGameService = require('../services/tactical-game-service');

jest.mock('../models/tactical-game-model');
jest.mock('../converters/tactical-game-converter');

describe('TacticalGameService', () => {
    describe('findById', () => {
        it('should return the game when found', async () => {
            const mockGame = { id: '1', name: 'Test Game' };
            TacticalGame.findById.mockResolvedValue(mockGame);
            tacticalGameConverter.toJSON.mockReturnValue(mockGame);

            const result = await tacticalGameService.findById('1');
            expect(result).toEqual(mockGame);
        });

        it('should throw an error when the game is not found', async () => {
            TacticalGame.findById.mockResolvedValue(null);

            await expect(tacticalGameService.findById('1')).rejects.toEqual({
                status: 404,
                message: 'Tactical game not found'
            });
        });
    });

    describe('find', () => {
        it('should return a list of games with pagination', async () => {
            const mockGames = [{ id: '1', name: 'Test Game' }];
            const mockFind = {
                skip: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                sort: jest.fn().mockResolvedValue(mockGames)
            };
            
            TacticalGame.find.mockReturnValue(mockFind);
            TacticalGame.countDocuments.mockResolvedValue(1);
            tacticalGameConverter.toJSON.mockReturnValue(mockGames[0]);

            const result = await tacticalGameService.find(null, 'user1', 0, 10);
            expect(result).toEqual({
                content: mockGames,
                pagination: { page: 0, size: 10, totalElements: 1 }
            });
        });
    });

    describe('insert', () => {
        it('should insert a new game and return it', async () => {
            const mockGame = { id: '1', name: 'Test Game' };
            const mockUser = { id: 'user1', username: 'testuser' };
            const mockData = { name: 'Test Game', description: 'Test Description', factions: ['Light', 'Evil'] };
            TacticalGame.prototype.save.mockResolvedValue(mockGame);
            tacticalGameConverter.toJSON.mockReturnValue(mockGame);

            const result = await tacticalGameService.insert(mockUser, mockData);
            expect(result).toEqual(mockGame);
        });
    });
});