/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { Body, Controller, Delete, Get, HttpCode, Logger, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBody, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';

import { JwtAuthGuard } from 'src/modules/auth/jwt.auth.guard';
import { Page } from '../../../shared/domain/entities/page.entity';
import { ErrorDto, PagedQueryDto } from '../../../shared/infrastructure/controller/dto';

import { AddGameActorsCommand } from '../../application/cqrs/commands/add-game-actors.command';
import { CreateGameCommand } from '../../application/cqrs/commands/create-game.command';
import { DeleteGameActorsCommand } from '../../application/cqrs/commands/delete-game-actors.command';
import { DeleteGameCommand } from '../../application/cqrs/commands/delete-game.command';
import { StartPhaseCommand } from '../../application/cqrs/commands/start-phase.command';
import { StartRoundCommand } from '../../application/cqrs/commands/start-round.command';
import { UpdateGameCommand } from '../../application/cqrs/commands/update-game.command';
import { GetGameQuery } from '../../application/cqrs/queries/get-game.query';
import { GetGamesQuery } from '../../application/cqrs/queries/get-games.query';
import { Game } from '../../domain/entities/game.aggregate';
import { AddGameActorsDto } from './dto/add-game-actors.dto';
import { AddGameFactionsDto } from './dto/add-game-factions.dto';
import { CreateGameDto } from './dto/create-game.dto';
import { DeleteGameActorsDto } from './dto/delete-game-actors.dto';
import { DeleteGameFactionsDto } from './dto/delete-game-factions.dto';
import { GameDto, GamePageDto, UpdateGameDto } from './dto/game.dto';

@UseGuards(JwtAuthGuard)
@Controller('v1/tactical-games')
@ApiTags('Games')
export class GameController {
  private readonly logger = new Logger(GameController.name);

  constructor(
    private commandBus: CommandBus,
    private queryBus: QueryBus,
  ) {}

  @Get(':id')
  @ApiOkResponse({ type: GameDto, description: 'Success' })
  @ApiOperation({ operationId: 'findGameById', summary: 'Find game by id' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  @ApiNotFoundResponse({ description: 'Game not found', type: ErrorDto })
  async findById(@Param('id') id: string, @Request() req) {
    this.logger.debug(`Find game << ${id}`);
    const user = req.user!;
    const query = new GetGameQuery(id, user.id as string, user.roles as string[]);
    const entity = await this.queryBus.execute<GetGameQuery, Game>(query);
    return GameDto.fromEntity(entity);
  }

  @Get('')
  @ApiOkResponse({ type: GamePageDto, description: 'Success' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  @ApiOperation({ operationId: 'findGames', summary: 'Find games by RSQL' })
  async find(@Query() dto: PagedQueryDto, @Request() req) {
    this.logger.debug(`Find games << ${JSON.stringify(dto)}`);
    const user = req.user!;
    const query = new GetGamesQuery(dto.q, dto.page, dto.size, user.id as string, user.roles as string[]);
    const page = await this.queryBus.execute<GetGamesQuery, Page<Game>>(query);
    const mapped = page.content.map((game) => GameDto.fromEntity(game));
    return new Page<GameDto>(mapped, page.pagination.page, page.pagination.size, page.pagination.totalElements);
  }

  @Post('')
  @ApiBody({ type: CreateGameDto })
  @ApiOperation({ operationId: 'createGame', summary: 'Create a new game' })
  @ApiOkResponse({ type: GameDto, description: 'Success' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  @ApiResponse({ status: 400, description: 'Bad request, invalid data', type: ErrorDto })
  async create(@Body() dto: CreateGameDto, @Request() req) {
    this.logger.debug(`Create game << ${JSON.stringify(dto)}`);
    const user = req.user!;
    const command = CreateGameDto.toCommand(dto, user.id as string, user.roles as string[]);
    const entity = await this.commandBus.execute<CreateGameCommand, Game>(command);
    return GameDto.fromEntity(entity);
  }

  @Patch(':id')
  @ApiOperation({ operationId: 'updateGame', summary: 'Update game' })
  @ApiOkResponse({ type: GameDto, description: 'Success' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  async updateSettings(@Param('id') id: string, @Body() dto: UpdateGameDto, @Request() req) {
    this.logger.debug(`Update game << ${JSON.stringify(dto)}`);
    const user = req.user!;
    const command = UpdateGameDto.toCommand(id, dto, user.id as string, user.roles as string[]);
    const entity = await this.commandBus.execute<UpdateGameCommand, Game>(command);
    return GameDto.fromEntity(entity);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  @ApiOperation({ operationId: 'deleteGame', summary: 'Delete game by id' })
  async delete(@Param('id') id: string, @Request() req) {
    this.logger.debug(`Delete game << ${id}`);
    const user = req.user!;
    const command = new DeleteGameCommand(id, user.id as string, user.roles as string[]);
    await this.commandBus.execute(command);
  }

  @Post(':id/rounds/start')
  @HttpCode(200)
  @ApiOperation({ operationId: 'startRound', summary: 'Start a new round for a game' })
  @ApiOkResponse({ type: GameDto, description: 'Success' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  async startRound(@Param('id') id: string, @Request() req) {
    const user = req.user!;
    const command = new StartRoundCommand(id, user.id as string, user.roles as string[]);
    const entity = await this.commandBus.execute<StartRoundCommand, Game>(command);
    return GameDto.fromEntity(entity);
  }

  @Post(':id/phases/start')
  @HttpCode(200)
  @ApiOperation({ operationId: 'startPhase', summary: 'Start a new phase for a game' })
  @ApiOkResponse({ type: GameDto, description: 'Success' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  async startPhase(@Param('id') id: string, @Request() req) {
    const user = req.user!;
    const command = new StartPhaseCommand(id, user.id as string, user.roles as string[]);
    const entity = await this.commandBus.execute<StartPhaseCommand, Game>(command);
    return GameDto.fromEntity(entity);
  }

  @Post(':id/factions')
  @HttpCode(200)
  @ApiOperation({ operationId: 'addGameFactions', summary: 'Add factions to game' })
  @ApiOkResponse({ type: AddGameFactionsDto, description: 'Success' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  async addFactions(@Param('id') id: string, @Body() dto: AddGameFactionsDto, @Request() req) {
    const user = req.user!;
    const command = AddGameFactionsDto.toCommand(id, dto, user.id as string, user.roles as string[]);
    const entity = await this.commandBus.execute<AddGameFactionsDto, Game>(command);
    return GameDto.fromEntity(entity);
  }

  @Delete(':id/factions')
  @HttpCode(200)
  @ApiOperation({ operationId: 'deleteGameFactions', summary: 'Delete game factions' })
  @ApiOkResponse({ type: DeleteGameFactionsDto, description: 'Success' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  async deleteFactions(@Param('id') id: string, @Body() dto: DeleteGameFactionsDto, @Request() req) {
    const user = req.user!;
    const command = DeleteGameFactionsDto.toCommand(id, dto, user.id as string, user.roles as string[]);
    const entity = await this.commandBus.execute<DeleteGameFactionsDto, Game>(command);
    return GameDto.fromEntity(entity);
  }

  @Post(':id/actors')
  @HttpCode(200)
  @ApiOperation({ operationId: 'addActors', summary: 'Add actors to game' })
  @ApiOkResponse({ type: AddGameActorsDto, description: 'Success' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  async addActors(@Param('id') id: string, @Body() dto: AddGameActorsDto, @Request() req) {
    const user = req.user!;
    const command = AddGameActorsDto.toCommand(id, dto, user.id as string, user.roles as string[]);
    const entity = await this.commandBus.execute<AddGameActorsCommand, Game>(command);
    return GameDto.fromEntity(entity);
  }

  @Delete(':id/actors')
  @HttpCode(200)
  @ApiOperation({ operationId: 'deleteGameActors', summary: 'Delete game actors' })
  @ApiOkResponse({ type: DeleteGameActorsDto, description: 'Success' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  async deleteActors(@Param('id') id: string, @Body() dto: DeleteGameActorsDto, @Request() req) {
    const user = req.user!;
    const command = DeleteGameActorsDto.toCommand(id, dto, user.id as string, user.roles as string[]);
    const entity = await this.commandBus.execute<DeleteGameActorsCommand, Game>(command);
    return GameDto.fromEntity(entity);
  }
}
