import { Body, Controller, Delete, Get, HttpCode, Logger, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../shared/infrastructure/security/jwt-auth.guard';
import { Page } from '../../../shared/application/pagination/page';
import { ApplyGameCommand } from '../../application/cqrs/commands/apply-game.command';
import { CreateGameCommand } from '../../application/cqrs/commands/create-game.command';
import { FinishGameCommand } from '../../application/cqrs/commands/finish-game.command';
import { GetFinishPreviewQuery } from '../../application/cqrs/queries/get-finish-preview.query';
import type { FinishPreview } from '../../domain/services/tactical-game-outcome.calculator';
import { DeleteGameCommand } from '../../application/cqrs/commands/delete-game.command';
import { RandomizeInitiativesCommand } from '../../application/cqrs/commands/randomize-initiatives.command';
import { StartPhaseCommand } from '../../application/cqrs/commands/start-phase.command';
import { StartRoundCommand } from '../../application/cqrs/commands/start-round.command';
import { UpdateGameCommand } from '../../application/cqrs/commands/update-game.command';
import { GetGameQuery } from '../../application/cqrs/queries/get-game.query';
import { GetGamesQuery } from '../../application/cqrs/queries/get-games.query';
import { Game } from '../../domain/aggregates/game';
import { CreateGameDto } from './dto/create-game.dto';
import { GameDto, GamePageDto } from './dto/game.dto';
import { AtRiskActorDto, FinishGameDto, FinishPreviewDto, TacticalGameOutcomeCharacterDto } from './dto/tactical-game-outcome.dto';
import { GamePagedQueryDto } from './dto/game-paged-query.dto';
import { UpdateGameDto } from './dto/update-game.dto';
import { ApiErrors } from '../../../shared/interfaces/http/api-errors.decorator';
import { CurrentUser } from '../../../shared/interfaces/http/current-user.decorator';
import type { AuthenticatedUser } from '../../../shared/interfaces/http/authenticated-request';

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
  @ApiErrors({ 404: 'Game not found' })
  async findById(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    this.logger.debug(`Find game << ${id}`);
    const query = new GetGameQuery(id, user.id, user.roles);
    const entity = await this.queryBus.execute<GetGameQuery, Game>(query);
    return GameDto.fromEntity(entity);
  }

  @Get('')
  @ApiOkResponse({ type: GamePageDto, description: 'Success' })
  @ApiErrors()
  @ApiOperation({ operationId: 'findGames', summary: 'Find games by RSQL' })
  async find(@Query() dto: GamePagedQueryDto, @CurrentUser() user: AuthenticatedUser) {
    this.logger.debug(`Find games << ${JSON.stringify(dto)}`);
    const query = new GetGamesQuery(dto.q, dto.page, dto.size, user.id, user.roles, dto.sort);
    const page = await this.queryBus.execute<GetGamesQuery, Page<Game>>(query);
    const mapped = page.content.map(game => GameDto.fromEntity(game));
    return new Page<GameDto>(mapped, page.pagination.page, page.pagination.size, page.pagination.totalElements);
  }

  @Post('')
  @ApiBody({ type: CreateGameDto })
  @ApiOperation({ operationId: 'createGame', summary: 'Create a new game' })
  @ApiOkResponse({ type: GameDto, description: 'Success' })
  @ApiErrors({ 400: 'Bad request, invalid data' })
  async create(@Body() dto: CreateGameDto, @CurrentUser() user: AuthenticatedUser) {
    this.logger.debug(`Create game << ${JSON.stringify(dto)}`);
    const command = CreateGameDto.toCommand(dto, user.id, user.roles);
    const entity = await this.commandBus.execute<CreateGameCommand, Game>(command);
    return GameDto.fromEntity(entity);
  }

  @Patch(':id')
  @ApiOperation({ operationId: 'updateGame', summary: 'Update game' })
  @ApiOkResponse({ type: GameDto, description: 'Success' })
  @ApiErrors()
  async updateSettings(@Param('id') id: string, @Body() dto: UpdateGameDto, @CurrentUser() user: AuthenticatedUser) {
    this.logger.debug(`Update game << ${JSON.stringify(dto)}`);
    const command = UpdateGameDto.toCommand(id, dto, user.id, user.roles);
    const entity = await this.commandBus.execute<UpdateGameCommand, Game>(command);
    return GameDto.fromEntity(entity);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiErrors()
  @ApiOperation({ operationId: 'deleteGame', summary: 'Delete game by id' })
  async delete(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    this.logger.debug(`Delete game << ${id}`);
    const command = new DeleteGameCommand(id, user.id, user.roles);
    await this.commandBus.execute(command);
  }

  @Post(':id/rounds/start')
  @HttpCode(200)
  @ApiOperation({ operationId: 'startRound', summary: 'Start a new round for a game' })
  @ApiOkResponse({ type: GameDto, description: 'Success' })
  @ApiErrors()
  async startRound(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    this.logger.debug(`Start round for game << ${id}`);
    const command = new StartRoundCommand(id, user.id, user.roles);
    const entity = await this.commandBus.execute<StartRoundCommand, Game>(command);
    return GameDto.fromEntity(entity);
  }

  @Post(':id/phases/start')
  @HttpCode(200)
  @ApiOperation({ operationId: 'startPhase', summary: 'Start a new phase for a game' })
  @ApiOkResponse({ type: GameDto, description: 'Success' })
  @ApiErrors()
  async startPhase(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    this.logger.debug(`Start phase for game << ${id}`);
    const command = new StartPhaseCommand(id, user.id, user.roles);
    const entity = await this.commandBus.execute<StartPhaseCommand, Game>(command);
    return GameDto.fromEntity(entity);
  }

  @Post(':id/initiatives/randomize')
  @HttpCode(200)
  @ApiOperation({ operationId: 'randomizeInitiatives', summary: 'Randomize undeclared initiatives' })
  @ApiOkResponse({ type: GameDto, description: 'Success' })
  @ApiErrors()
  async randomizeInitiatives(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    this.logger.debug(`Randomize initiatives for game << ${id}`);
    const command = new RandomizeInitiativesCommand(id, user.id, user.roles);
    const entity = await this.commandBus.execute<RandomizeInitiativesCommand, Game>(command);
    return GameDto.fromEntity(entity);
  }

  @Get(':id/finish-preview')
  @ApiOkResponse({ type: FinishPreviewDto, description: 'Success' })
  @ApiOperation({ operationId: 'getFinishPreview', summary: 'Outcome the game would finish with, and the characters at risk' })
  @ApiErrors({ 404: 'Game not found' })
  async finishPreview(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    const preview = await this.queryBus.execute<GetFinishPreviewQuery, FinishPreview>(new GetFinishPreviewQuery(id, user.id, user.roles));
    const dto = new FinishPreviewDto();
    dto.gameId = id;
    dto.characters = preview.characters.map(character => TacticalGameOutcomeCharacterDto.fromEntity(character));
    dto.atRisk = preview.atRisk.map(actor => AtRiskActorDto.fromEntity(actor));
    return dto;
  }

  @Post(':id/finish')
  @HttpCode(200)
  @ApiBody({ type: FinishGameDto })
  @ApiOperation({ operationId: 'finishGame', summary: 'Finish a game in progress (spec 013)' })
  @ApiOkResponse({ type: GameDto, description: 'Success' })
  @ApiErrors({ 400: 'err-finish-fate-required (details.atRisk), err-game-not-in-progress', 409: 'err-game-finished' })
  async finish(@Param('id') id: string, @Body() dto: FinishGameDto, @CurrentUser() user: AuthenticatedUser) {
    const command = new FinishGameCommand(id, dto.fates || [], user.id, user.roles);
    const entity = await this.commandBus.execute<FinishGameCommand, Game>(command);
    return GameDto.fromEntity(entity);
  }

  @Post(':id/apply')
  @HttpCode(200)
  @ApiOperation({ operationId: 'applyGame', summary: 'Apply the outcome of a finished game to the strategic characters (spec 013)' })
  @ApiOkResponse({ type: GameDto, description: 'Success: outcome.characters[].appliedAt or error' })
  @ApiErrors({ 400: 'err-game-not-finished', 409: 'err-outcome-already-applied' })
  async applyOutcome(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    const command = new ApplyGameCommand(id, user.id, user.roles);
    const entity = await this.commandBus.execute<ApplyGameCommand, Game>(command);
    return GameDto.fromEntity(entity);
  }
}
