/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import * as raceRepository from '../../application/ports/outbound/race-repository';
import { JwtAuthGuard } from 'src/modules/auth/jwt.auth.guard';
import { PagedQueryDto } from './dto/paged-rsql-query';
import { UpdateRaceCommand } from '../../application/commands/update-race.command';
import { DeleteRaceCommand } from '../../application/commands/delete-race.command';
import { Page } from '../../domain/entities/page';
import { GetRaceQuery } from '../../application/queries/get-race.query';
import { Race } from '../../domain/entities/race';
import { GetRacesQuery } from '../../application/queries/get-races.query';
import { RacePageDto } from './dto/page.dto';
import { RaceDto } from './dto/race.dto';
import { CreateRaceDto } from './dto/create-race.dto';

@UseGuards(JwtAuthGuard)
@Controller('v1/races')
@ApiTags('Races')
export class RaceController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    @Inject('RaceRepository') private readonly raceRepository: raceRepository.RaceRepository,
  ) {}

  @Get(':id')
  @ApiOkResponse({ type: RaceDto })
  @ApiOperation({ operationId: 'findRaceById', summary: 'Find race by id' })
  async findById(@Param('id') id: string, @Request() req) {
    const entity = await this.queryBus.execute<GetRaceQuery, Race>(new GetRaceQuery(id, req.user!.id as string));
    return RaceDto.fromEntity(entity);
  }

  @Get('')
  @ApiOkResponse({ type: RacePageDto })
  @ApiOperation({ operationId: 'findRaces', summary: 'Find races by RSQL' })
  async find(@Query() dto: PagedQueryDto, @Request() req) {
    const userId: string = req.user!.id as string;
    const query = new GetRacesQuery(dto.q, dto.page, dto.size, userId);
    const page = await this.queryBus.execute<GetRacesQuery, Page<Race>>(query);
    const mapped = page.content.map((race) => RaceDto.fromEntity(race));
    return new Page<RaceDto>(mapped, page.pagination.page, page.pagination.size, page.pagination.totalElements);
  }

  @Post('')
  @ApiOkResponse({ type: RaceDto })
  @ApiOperation({ operationId: 'createRace', summary: 'Create a new race' })
  create(@Body() createRaceDto: CreateRaceDto, @Request() req) {
    const command = CreateRaceDto.toCommand(createRaceDto, req.user!.id as string, req.user!.roles as string[]);
    return this.commandBus.execute(command);
  }

  @Patch(':id')
  @ApiOkResponse({ type: RaceDto })
  @ApiOperation({ operationId: 'updateRace', summary: 'Update race by id' })
  updateSettings(@Param('id') id: string, @Request() req) {
    // const userId = req.user!.id as string;
    const command: UpdateRaceCommand = {
      ...req.body,
      id: id,
    };
    return this.commandBus.execute(command);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ operationId: 'deleteRace', summary: 'Delete race by id' })
  async delete(@Param('id') id: string, @Request() req) {
    const command = new DeleteRaceCommand(id, undefined, req.user!.id as string, req.user!.roles as string[]);
    await this.commandBus.execute(command);
  }
}
