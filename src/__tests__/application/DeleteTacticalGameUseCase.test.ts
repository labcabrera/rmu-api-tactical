import { DeleteGameUseCase } from "../../application/use-cases/games/delete-game-use-case";
import { FindTacticalGameByIdUseCase } from "../../application/use-cases/games/FindTacticalGameByIdUseCase";
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

const mockFindByIdUseCase: jest.Mocked<FindTacticalGameByIdUseCase> = {
  execute: jest.fn(),
} as any;

describe("DeleteTacticalGameUseCase", () => {
  let useCase: DeleteGameUseCase;

  beforeEach(() => {
    useCase = new DeleteGameUseCase(
      mockRepository,
      mockLogger,
      mockFindByIdUseCase,
    );
    jest.clearAllMocks();
  });

  describe("execute", () => {
    it("should delete an existing game successfully", async () => {
      const gameId = "1";
      const existingGame: Game = {
        id: gameId,
        name: "Test Game",
        user: "test@example.com",
        status: "created",
        factions: ["Light"],
        round: 1,
      };

      mockFindByIdUseCase.execute.mockResolvedValue(existingGame);
      mockRepository.delete.mockResolvedValue(true);

      await useCase.execute(gameId);

      expect(mockFindByIdUseCase.execute).toHaveBeenCalledWith(gameId);
      expect(mockRepository.delete).toHaveBeenCalledWith(gameId);
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Deleting tactical game with ID: ${gameId}`,
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Deleted tactical game with ID: ${gameId}`,
      );
    });

    it("should throw an error when the game to delete is not found", async () => {
      const gameId = "1";
      const error = new Error("Tactical game not found");
      (error as any).status = 404;

      mockFindByIdUseCase.execute.mockRejectedValue(error);

      await expect(useCase.execute(gameId)).rejects.toThrow(
        "Tactical game not found",
      );
      expect(mockRepository.delete).not.toHaveBeenCalled();
    });

    it("should throw an error when repository delete fails", async () => {
      const gameId = "1";
      const existingGame: Game = {
        id: gameId,
        name: "Test Game",
        user: "test@example.com",
        status: "created",
        factions: ["Light"],
        round: 1,
      };

      mockFindByIdUseCase.execute.mockResolvedValue(existingGame);
      mockRepository.delete.mockResolvedValue(false);

      await expect(useCase.execute(gameId)).rejects.toThrow(
        "Failed to delete tactical game",
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        `Failed to delete tactical game with ID: ${gameId}`,
      );
    });
  });
});
