import { CreateGameCommand } from '../../application/commands/create-game.command';
import { UpdateGameCommand } from '../../application/commands/update-game.command';
import { Game } from '../../domain/entities/game.entity';

export class GameDto {
  id: string;
  name: string;
  description: string | undefined;

  static fromEntity(entity: Game) {
    const dto = new GameDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.description = entity.description;
    return dto;
  }
}

export class CreateGameDto {
  name: string;
  description: string | undefined;
  factions: string[] | undefined;

  static toCommand(dto: CreateGameDto, userId: string, roles: string[]) {
    return new CreateGameCommand(dto.name, dto.description, dto.factions, userId, roles);
  }
}

export class UpdateGameDto {
  name: string;
  description: string | undefined;

  static toCommand(id: string, dto: UpdateGameDto, userId: string, roles: string[]) {
    return new UpdateGameCommand(id, dto.name, dto.description, userId, roles);
  }
}
