import { Body, Controller, Inject, Delete, HttpCode, Logger, Param, Post, Put, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../shared/infrastructure/security/jwt-auth.guard.js';
import { Game } from '../../domain/aggregates/game.js';
import { AddGameFactionsDto } from './dto/add-game-factions.dto.js';
import { DeleteGameFactionsDto } from './dto/delete-game-factions.dto.js';
import { GameDto } from './dto/game.dto.js';
import { SetGameSidesDto } from './dto/game-side.dto.js';
import { SetGameSidesCommand } from '../../application/cqrs/commands/set-game-sides.command.js';
import { ApiErrors } from '../../../shared/interfaces/http/api-errors.decorator.js';
import { CurrentUser } from '../../../shared/interfaces/http/current-user.decorator.js';
import type { AuthenticatedUser } from '../../../shared/interfaces/http/authenticated-request.js';
import { GameAccess, GameAccessGuard } from './security/game-access.guard.js';
import { GAME_GUARD, type GameGuardPort } from '../../application/ports/game-guard.port.js';

@UseGuards(JwtAuthGuard, GameAccessGuard)
@Controller('v1/tactical-games')
@ApiTags('Games')
export class GameFactionController {
  private readonly logger = new Logger(GameFactionController.name);

  constructor(
    private commandBus: CommandBus,
    @Inject(GAME_GUARD) private readonly gameGuard: GameGuardPort,
  ) {}

  @GameAccess('manage')
  @Post(':id/factions')
  @HttpCode(200)
  @ApiOperation({ operationId: 'addGameFactions', summary: 'Add factions to game' })
  @ApiOkResponse({ type: AddGameFactionsDto, description: 'Success' })
  @ApiErrors()
  async addFactions(@Param('id') id: string, @Body() dto: AddGameFactionsDto, @CurrentUser() user: AuthenticatedUser) {
    const command = AddGameFactionsDto.toCommand(id, dto, user.id, user.roles);
    const entity = await this.commandBus.execute<AddGameFactionsDto, Game>(command);
    return this.toDto(entity, user);
  }

  @GameAccess('manage')
  @Delete(':id/factions')
  @HttpCode(200)
  @ApiOperation({ operationId: 'deleteGameFactions', summary: 'Delete game factions' })
  @ApiOkResponse({ type: DeleteGameFactionsDto, description: 'Success' })
  @ApiErrors()
  async deleteFactions(@Param('id') id: string, @Body() dto: DeleteGameFactionsDto, @CurrentUser() user: AuthenticatedUser) {
    const command = DeleteGameFactionsDto.toCommand(id, dto, user.id, user.roles);
    const entity = await this.commandBus.execute<DeleteGameFactionsDto, Game>(command);
    return this.toDto(entity, user);
  }

  /**
   * Workspace spec 100: every side of the game at once, only while it is `created` (409 `err-sides-locked`). The
   * factions have to be an exact partition (`err-sides-invalid`) and a leader an actor of its side
   * (`err-side-leader-invalid`).
   */
  @GameAccess('manage')
  @Put(':id/sides')
  @HttpCode(200)
  @ApiOperation({ operationId: 'setGameSides', summary: 'Set the sides of a game' })
  @ApiOkResponse({ type: GameDto, description: 'Success' })
  @ApiErrors({ 400: 'Invalid sides or leader', 409: 'The game already started, or version conflict' })
  async setSides(@Param('id') id: string, @Body() dto: SetGameSidesDto, @CurrentUser() user: AuthenticatedUser) {
    const command = SetGameSidesDto.toCommand(id, dto, user.id, user.roles);
    const entity = await this.commandBus.execute<SetGameSidesCommand, Game>(command);
    return this.toDto(entity, user);
  }

  /** The game with the `access` of the caller (workspace spec 072, contract 23). */
  private toDto(game: Game, user: AuthenticatedUser): GameDto {
    return GameDto.fromEntity(game, this.gameGuard.accessOf(game, user.id, user.roles));
  }
}
