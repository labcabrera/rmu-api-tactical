/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { Controller, Get, Logger, Param, Query, Request, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';

import { JwtAuthGuard } from 'src/modules/auth/jwt.auth.guard';
import { Page } from '../../../shared/domain/entities/page.entity';
import { ErrorDto, PagedQueryDto } from '../../../shared/infrastructure/controller/dto';
import { GetCharacterRoundQuery } from '../../application/queries/get-character-round.query';
import { GetCharacterRoundsQuery } from '../../application/queries/get-character-rounds.query';
import { CharacterRound } from '../../domain/entities/character-round.entity';
import { CharacterRoundDto, CharacterRoundPageDto } from './dto/character-round.dto';

@UseGuards(JwtAuthGuard)
@Controller('v1/tactical-character-rounds')
@ApiTags('Character Rounds')
export class CharacterRoundController {
  private readonly logger = new Logger(CharacterRoundController.name);

  constructor(
    private commandBus: CommandBus,
    private queryBus: QueryBus,
  ) {}

  @Get(':id')
  @ApiOkResponse({ type: CharacterRoundDto, description: 'Success' })
  @ApiOperation({ operationId: 'findCharacterRoundById', summary: 'Find character round by id' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  @ApiNotFoundResponse({ description: 'Character round not found', type: ErrorDto })
  async findById(@Param('id') id: string, @Request() req) {
    const user = req.user!;
    const query = new GetCharacterRoundQuery(id, user.id as string, user.roles as string[]);
    const entity = await this.queryBus.execute<GetCharacterRoundQuery, CharacterRound>(query);
    this.logger.debug(`Character round found: ${JSON.stringify(entity)}`);
    return CharacterRoundDto.fromEntity(entity);
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
    const query = new GetCharacterRoundsQuery(dto.q, dto.page, dto.size, user.id as string, user.roles as string[]);
    const page = await this.queryBus.execute<GetCharacterRoundsQuery, Page<CharacterRound>>(query);
    const mapped = page.content.map((characterRound) => CharacterRoundDto.fromEntity(characterRound));
    return new Page<CharacterRoundDto>(mapped, page.pagination.page, page.pagination.size, page.pagination.totalElements);
  }
}
