import { Body, Controller, Inject, Delete, HttpCode, Logger, Param, Post, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../shared/infrastructure/security/jwt-auth.guard.js';
import { AddGameActorsCommand } from '../../application/cqrs/commands/add-game-actors.command.js';
import { DeleteGameActorsCommand } from '../../application/cqrs/commands/delete-game-actors.command.js';
import { Game } from '../../domain/aggregates/game.js';
import { AddGameActorsDto } from './dto/add-game-actors.dto.js';
import { DeleteGameActorsDto } from './dto/delete-game-actors.dto.js';
import { GameDto } from './dto/game.dto.js';
import { ApiErrors } from '../../../shared/interfaces/http/api-errors.decorator.js';
import { CurrentUser } from '../../../shared/interfaces/http/current-user.decorator.js';
import type { AuthenticatedUser } from '../../../shared/interfaces/http/authenticated-request.js';
import { GameAccess, GameAccessGuard } from './security/game-access.guard.js';
import { GAME_GUARD, type GameGuardPort } from '../../application/ports/game-guard.port.js';

@UseGuards(JwtAuthGuard, GameAccessGuard)
@Controller('v1/tactical-games')
@ApiTags('Games')
export class GameActorController {
  private readonly logger = new Logger(GameActorController.name);

  constructor(
    private commandBus: CommandBus,
    @Inject(GAME_GUARD) private readonly gameGuard: GameGuardPort,
  ) {}

  @GameAccess('manage')
  @Post(':id/actors')
  @HttpCode(200)
  @ApiOperation({ operationId: 'addActors', summary: 'Add actors to game' })
  @ApiOkResponse({ type: AddGameActorsDto, description: 'Success' })
  @ApiErrors()
  async addActors(@Param('id') id: string, @Body() dto: AddGameActorsDto, @CurrentUser() user: AuthenticatedUser) {
    const command = AddGameActorsDto.toCommand(id, dto, user.id, user.roles);
    const entity = await this.commandBus.execute<AddGameActorsCommand, Game>(command);
    return this.toDto(entity, user);
  }

  @GameAccess('manage')
  @Delete(':id/actors')
  @HttpCode(200)
  @ApiOperation({ operationId: 'deleteGameActors', summary: 'Delete game actors' })
  @ApiOkResponse({ type: DeleteGameActorsDto, description: 'Success' })
  @ApiErrors()
  async deleteActors(@Param('id') id: string, @Body() dto: DeleteGameActorsDto, @CurrentUser() user: AuthenticatedUser) {
    const command = DeleteGameActorsDto.toCommand(id, dto, user.id, user.roles);
    const entity = await this.commandBus.execute<DeleteGameActorsCommand, Game>(command);
    return this.toDto(entity, user);
  }

  /** The game with the `access` of the caller (workspace spec 072, contract 23). */
  private toDto(game: Game, user: AuthenticatedUser): GameDto {
    return GameDto.fromEntity(game, this.gameGuard.accessOf(game, user.id, user.roles));
  }
}
