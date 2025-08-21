/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { Controller, Get, Logger, Param, Query, Request, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';

import { JwtAuthGuard } from 'src/modules/auth/jwt.auth.guard';
import { Page } from '../../../shared/domain/entities/page.entity';
import { ErrorDto, PagedQueryDto } from '../../../shared/infrastructure/controller/dto';
import { GetActorRoundQuery } from '../../application/queries/get-actor-round.query';
import { GetActorsRoundsQuery } from '../../application/queries/get-actor-rounds.query';
import { ActorRound } from '../../domain/entities/actor-round.entity';
import { ActorRoundDto, CharacterRoundPageDto } from './dto/actor-round.dto';

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
  @ApiOperation({ operationId: 'findCharacterRoundById', summary: 'Find character round by id' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  @ApiNotFoundResponse({ description: 'Character round not found', type: ErrorDto })
  async findById(@Param('id') id: string, @Request() req) {
    const user = req.user!;
    const query = new GetActorRoundQuery(id, user.id as string, user.roles as string[]);
    const entity = await this.queryBus.execute<GetActorRoundQuery, ActorRound>(query);
    this.logger.debug(`Character round found: ${JSON.stringify(entity)}`);
    return ActorRoundDto.fromEntity(entity);
  }

  @Get('')
  @ApiOkResponse({ type: CharacterRoundPageDto, description: 'Success' })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing authentication token',
    type: ErrorDto,
  })
  @ApiOperation({ operationId: 'findCharacterRounds', summary: 'Find character rounds by RSQL' })
  async find(@Query() dto: PagedQueryDto, @Request() req) {
    this.logger.debug(`Finding character rounds with query: ${JSON.stringify(dto)}`);
    const user = req.user!;
    const query = new GetActorsRoundsQuery(dto.q, dto.page, dto.size, user.id as string, user.roles as string[]);
    const page = await this.queryBus.execute<GetActorsRoundsQuery, Page<ActorRound>>(query);
    const mapped = page.content.map((characterRound) => ActorRoundDto.fromEntity(characterRound));
    return new Page<ActorRoundDto>(mapped, page.pagination.page, page.pagination.size, page.pagination.totalElements);
  }
}
