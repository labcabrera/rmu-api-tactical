/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Body, Controller, Get, Logger, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/jwt.auth.guard';
import { Page } from '../../../shared/domain/entities/page.entity';
import { ErrorDto, PagedQueryDto } from '../../../shared/interfaces/http/dto';
import { AddEffectCommand } from '../../application/cqrs/commands/add-effect.command';
import { AddHpCommand } from '../../application/cqrs/commands/add-hp.command';
import { DeclareInitiativeCommand } from '../../application/cqrs/commands/declare-initiative.command';
import { GetActorRoundQuery } from '../../application/cqrs/queries/get-actor-round.query';
import { GetActorsRoundsQuery } from '../../application/cqrs/queries/get-actor-rounds.query';
import { ActorRound } from '../../domain/entities/actor-round.aggregate';
import { ActorRoundDto, CharacterRoundPageDto } from './dto/actor-round.dto';
import { AddEffectDto } from './dto/add-effect.dto';
import { AddHpDto } from './dto/add-hp.dto';
import { DeclareInitiativeDto } from './dto/declare-initiative.dto';

@UseGuards(JwtAuthGuard)
@Controller('v1/actor-rounds')
@ApiTags('Actor Rounds')
export class ActorRoundController {
  private readonly logger = new Logger(ActorRoundController.name);

  constructor(
    private commandBus: CommandBus,
    private queryBus: QueryBus,
  ) {}

  @Get(':id')
  @ApiOkResponse({ type: ActorRoundDto, description: 'Success' })
  @ApiOperation({ operationId: 'findActorRoundById', summary: 'Find actor round by id' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  @ApiNotFoundResponse({ description: 'Actor round not found', type: ErrorDto })
  async findById(@Param('id') id: string, @Request() req) {
    const user = req.user!;
    const query = new GetActorRoundQuery(id, user.id as string, user.roles as string[]);
    const entity = await this.queryBus.execute<GetActorRoundQuery, ActorRound>(query);
    this.logger.debug(`Actor round found: ${JSON.stringify(entity)}`);
    return ActorRoundDto.fromEntity(entity);
  }

  @Get('')
  @ApiOkResponse({ type: CharacterRoundPageDto, description: 'Success' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  @ApiOperation({ operationId: 'findActorRounds', summary: 'Find actor rounds by RSQL' })
  async find(@Query() dto: PagedQueryDto, @Request() req) {
    this.logger.debug(`Finding actor rounds with query: ${JSON.stringify(dto)}`);
    const user = req.user!;
    const query = new GetActorsRoundsQuery(dto.q, dto.page, dto.size, user.id as string, user.roles as string[]);
    const page = await this.queryBus.execute<GetActorsRoundsQuery, Page<ActorRound>>(query);
    const mapped = page.content.map((actorRound) => ActorRoundDto.fromEntity(actorRound));
    return new Page<ActorRoundDto>(mapped, page.pagination.page, page.pagination.size, page.pagination.totalElements);
  }

  @Patch(':id/initiative')
  @ApiOkResponse({ type: ActorRoundDto, description: 'Success' })
  @ApiOperation({ operationId: 'declareInitiative', summary: 'Declare initiative' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  @ApiNotFoundResponse({ description: 'Actor round not found', type: ErrorDto })
  async declareInitiative(@Param('id') id: string, @Body() dto: DeclareInitiativeDto, @Request() req) {
    const user = req.user!;
    const command = DeclareInitiativeDto.toCommand(id, dto, user.id as string, user.roles as string[]);
    const entity = await this.commandBus.execute<DeclareInitiativeCommand, ActorRound>(command);
    return ActorRoundDto.fromEntity(entity);
  }

  @Patch(':id/hp')
  @ApiOkResponse({ type: ActorRoundDto, description: 'Success' })
  @ApiOperation({ operationId: 'addHp', summary: 'Add or subtract HP' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  @ApiNotFoundResponse({ description: 'Actor round not found', type: ErrorDto })
  async addHp(@Param('id') id: string, @Body() dto: AddHpDto, @Request() req) {
    const user = req.user!;
    const command = AddHpDto.toCommand(id, dto, user.id as string, user.roles as string[]);
    const entity = await this.commandBus.execute<AddHpCommand, ActorRound>(command);
    return ActorRoundDto.fromEntity(entity);
  }

  @Post(':id/effects')
  @ApiOkResponse({ type: ActorRoundDto, description: 'Success' })
  @ApiOperation({ operationId: 'addEffect', summary: 'Add effect' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  @ApiNotFoundResponse({ description: 'Actor round not found', type: ErrorDto })
  async addEffect(@Param('id') id: string, @Body() dto: AddEffectDto, @Request() req) {
    const user = req.user!;
    const command = AddEffectDto.toCommand(id, dto, user.id as string, user.roles as string[]);
    const entity = await this.commandBus.execute<AddEffectCommand, ActorRound>(command);
    return ActorRoundDto.fromEntity(entity);
  }
}
