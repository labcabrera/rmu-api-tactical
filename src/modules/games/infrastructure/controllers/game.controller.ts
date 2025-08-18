/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBody, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';

import { JwtAuthGuard } from 'src/modules/auth/jwt.auth.guard';
import { Page } from '../../../core/domain/entities/page';
import { ErrorDto } from '../../../core/infrastructure/controllers/dto/error-dto';
import { PagedQueryDto } from '../../../core/infrastructure/controllers/dto/paged-rsql-query';
import { CreateGameCommand } from '../../application/commands/create-game.command';
import { DeleteGameCommand } from '../../application/commands/delete-game.command';
import { UpdateGameCommand } from '../../application/commands/update-game.command';
import { GetGameQuery } from '../../application/queries/handlers/get-game.query';
import { GetGamesQuery } from '../../application/queries/handlers/get-games.query';
import { Game } from '../../domain/entities/game.entity';
import { CreateGameDto, GameDto, UpdateGameDto } from './game.dto';

@UseGuards(JwtAuthGuard)
@Controller('v1/realms')
@ApiTags('Realms')
export class RealmController {
  constructor(
    private commandBus: CommandBus,
    private queryBus: QueryBus,
  ) {}

  @Get(':id')
  @ApiOkResponse({ type: GameDto, description: 'Success' })
  @ApiOperation({ operationId: 'findGameById', summary: 'Find game by id' })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing authentication token',
    type: ErrorDto,
  })
  @ApiNotFoundResponse({
    description: 'Realm not found',
    type: ErrorDto,
  })
  async findById(@Param('id') id: string, @Request() req) {
    const query = new GetGameQuery(id, req.user!.id as string);
    const entity = await this.queryBus.execute<GetGameQuery, Game>(query);
    return GameDto.fromEntity(entity);
  }

  @Get('')
  //   @ApiOkResponse({ type: GamePageDto, description: 'Success' })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing authentication token',
    type: ErrorDto,
  })
  @ApiOperation({ operationId: 'findRealms', summary: 'Find realms by RSQL' })
  async find(@Query() dto: PagedQueryDto, @Request() req) {
    const userId: string = req.user!.id as string;
    const query = new GetGamesQuery(dto.q, dto.page, dto.size, userId);
    const page = await this.queryBus.execute<GetGamesQuery, Page<Game>>(query);
    const mapped = page.content.map((realm) => GameDto.fromEntity(realm));
    return new Page<GameDto>(mapped, page.pagination.page, page.pagination.size, page.pagination.totalElements);
  }

  @Post('')
  @ApiBody({ type: CreateGameDto })
  @ApiOperation({ operationId: 'createGame', summary: 'Create a new game' })
  @ApiOkResponse({ type: GameDto, description: 'Success' })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing authentication token',
    type: ErrorDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request, invalid data',
    type: ErrorDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict, realm already exists',
    type: ErrorDto,
  })
  async create(@Body() dto: CreateGameDto, @Request() req) {
    const user = req.user!;
    const command = CreateGameDto.toCommand(dto, user.id as string, user.roles as string[]);
    const entity = await this.commandBus.execute<CreateGameCommand, Game>(command);
    return GameDto.fromEntity(entity);
  }

  @Patch(':id')
  @ApiOperation({ operationId: 'updateGame', summary: 'Update game' })
  @ApiOkResponse({ type: GameDto, description: 'Success' })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing authentication token',
    type: ErrorDto,
  })
  async updateSettings(@Param('id') id: string, @Body() dto: UpdateGameDto, @Request() req) {
    const user = req.user!;
    const command = UpdateGameDto.toCommand(id, dto, user.id as string, user.roles as string[]);
    const entity = await this.commandBus.execute<UpdateGameCommand, Game>(command);
    return GameDto.fromEntity(entity);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing authentication token',
    type: ErrorDto,
  })
  @ApiOperation({ operationId: 'deleteRealm', summary: 'Delete realm by id' })
  async delete(@Param('id') id: string, @Request() req) {
    const user = req.user!;
    const command = new DeleteGameCommand(id, user.id as string, user.roles as string[]);
    await this.commandBus.execute(command);
  }
}
