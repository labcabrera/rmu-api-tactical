/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBody, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { CommandBus, QueryBus } from '@nestjs/cqrs';

import { JwtAuthGuard } from 'src/modules/auth/jwt.auth.guard';
import { UpdateRealmCommand } from '../../application/commands/update-realm.command';
import { CreateRealmCommand } from '../../application/commands/create-realm.command';
import { PagedQueryDto } from './dto/paged-rsql-query';
import { GetRealmQuery } from '../../application/queries/get-realm.query';
import { GetRealmsQuery } from '../../application/queries/get-realms.query';
import { DeleteRealmCommand } from '../../application/commands/delete-realm.command';
import { RealmDto } from './dto/realm.dto';
import { Realm } from '../../domain/entities/realm';
import { Page } from '../../domain/entities/page';
import { ErrorDto } from './dto/error-dto';
import { RealmPageDto } from './dto/page.dto';
import { CreateRealmDto } from './dto/create-realm.dto';
import { UpdateRealmDto } from './dto/update-realm.dto';

@UseGuards(JwtAuthGuard)
@Controller('v1/realms')
@ApiTags('Realms')
export class RealmController {
  constructor(
    private commandBus: CommandBus,
    private queryBus: QueryBus,
  ) {}

  @Get(':id')
  @ApiOkResponse({ type: RealmDto, description: 'Success' })
  @ApiOperation({ operationId: 'findRealmById', summary: 'Find realm by id' })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing authentication token',
    type: ErrorDto,
  })
  @ApiNotFoundResponse({
    description: 'Realm not found',
    type: ErrorDto,
  })
  async findById(@Param('id') id: string, @Request() req) {
    const query = new GetRealmQuery(id, req.user!.id as string);
    const entity = await this.queryBus.execute<GetRealmQuery, Realm>(query);
    return RealmDto.fromEntity(entity);
  }

  @Get('')
  @ApiOkResponse({ type: RealmPageDto, description: 'Success' })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing authentication token',
    type: ErrorDto,
  })
  @ApiOperation({ operationId: 'findRealms', summary: 'Find realms by RSQL' })
  async find(@Query() dto: PagedQueryDto, @Request() req) {
    const userId: string = req.user!.id as string;
    const query = new GetRealmsQuery(dto.q, dto.page, dto.size, userId);
    const page = await this.queryBus.execute<GetRealmsQuery, Page<Realm>>(query);
    const mapped = page.content.map((realm) => RealmDto.fromEntity(realm));
    return new Page<RealmDto>(mapped, page.pagination.page, page.pagination.size, page.pagination.totalElements);
  }

  @Post('')
  @ApiBody({ type: CreateRealmDto })
  @ApiOperation({ operationId: 'createRealm', summary: 'Create a new realm' })
  @ApiOkResponse({ type: RealmDto, description: 'Success' })
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
  async create(@Body() dto: CreateRealmDto, @Request() req) {
    const user = req.user!;
    const command = CreateRealmDto.toCommand(dto, user.id as string, user.roles as string[]);
    const entity = await this.commandBus.execute<CreateRealmCommand, Realm>(command);
    return RealmDto.fromEntity(entity);
  }

  @Patch(':id')
  @ApiOperation({ operationId: 'updateRealm', summary: 'Update realm' })
  @ApiOkResponse({ type: RealmDto, description: 'Success' })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing authentication token',
    type: ErrorDto,
  })
  async updateSettings(@Param('id') id: string, @Body() dto: UpdateRealmDto, @Request() req) {
    const user = req.user!;
    const command = UpdateRealmDto.toCommand(id, dto, user.id as string, user.roles as string[]);
    const entity = await this.commandBus.execute<UpdateRealmCommand, Realm>(command);
    return RealmDto.fromEntity(entity);
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
    const command = new DeleteRealmCommand(id, undefined, user.id as string, user.roles! as string[]);
    await this.commandBus.execute(command);
  }
}
