import { CreateGameCommand } from "../../application/commands/create-game.command";
import { CreateGameUseCase } from "../../application/use-cases/games/create-game-use-case";
import { Game } from "../../domain/entities/game.entity";
import { GameRepository } from "../../domain/ports/game.repository";
import { Logger } from "../../domain/ports/logger";

// Mocks
const mockRepository: jest.Mocked<GameRepository> = {
  findById: jest.fn(),
  find: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  countBy: jest.fn(),
};

const mockLogger: jest.Mocked<Logger> = {
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

describe("CreateTacticalGameUseCase", () => {
  let useCase: CreateGameUseCase;

  beforeEach(() => {
    useCase = new CreateGameUseCase(mockRepository, mockLogger);
    jest.clearAllMocks();
  });

  describe("execute", () => {
    it("should create a new game and return it", async () => {
      const command: CreateGameCommand = {
        user: "test@example.com",
        name: "New Game",
        description: "Test description",
      };

      const savedGame: Game = {
        id: "1",
        user: "test@example.com",
        name: "New Game",
        description: "Test description",
        status: "created",
        factions: ["Light", "Evil", "Neutral"],
        round: 0,
      };

      mockRepository.save.mockResolvedValue(savedGame);

      const result = await useCase.execute(command);

      expect(result).toEqual(savedGame);
      expect(mockRepository.save).toHaveBeenCalledWith({
        user: "test@example.com",
        name: "New Game",
        description: "Test description",
        status: "created",
        factions: ["Light", "Evil", "Neutral"],
        round: 0,
      });
      expect(mockLogger.info).toHaveBeenCalledWith(
        "Creating tactical game: New Game for user: test@example.com",
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        "Created tactical game with ID: 1",
      );
    });

    it("should use default factions when none provided", async () => {
      const command: CreateGameCommand = {
        user: "test@example.com",
        name: "New Game",
      };

      const savedGame: Game = {
        id: "1",
        user: "test@example.com",
        name: "New Game",
        status: "created",
        factions: ["Light", "Evil", "Neutral"],
        round: 0,
      };

      mockRepository.save.mockResolvedValue(savedGame);

      await useCase.execute(command);

      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          factions: ["Light", "Evil", "Neutral"],
        }),
      );
    });

    it("should use provided factions when given", async () => {
      const command: CreateGameCommand = {
        user: "test@example.com",
        name: "New Game",
        factions: ["Custom", "Faction"],
      };

      const savedGame: Game = {
        id: "1",
        user: "test@example.com",
        name: "New Game",
        status: "created",
        factions: ["Custom", "Faction"],
        round: 0,
      };

      mockRepository.save.mockResolvedValue(savedGame);

      await useCase.execute(command);

      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          factions: ["Custom", "Faction"],
        }),
      );
    });

    it("should not include description when not provided", async () => {
      const command: CreateGameCommand = {
        user: "test@example.com",
        name: "New Game",
      };

      const savedGame: Game = {
        id: "1",
        user: "test@example.com",
        name: "New Game",
        status: "created",
        factions: ["Light", "Evil", "Neutral"],
        round: 0,
      };

      mockRepository.save.mockResolvedValue(savedGame);

      await useCase.execute(command);

      expect(mockRepository.save).toHaveBeenCalledWith({
        user: "test@example.com",
        name: "New Game",
        status: "created",
        factions: ["Light", "Evil", "Neutral"],
        round: 0,
      });
    });
  });
});
