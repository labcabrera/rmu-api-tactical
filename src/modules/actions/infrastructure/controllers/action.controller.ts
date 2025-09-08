/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { Body, Controller, Delete, Get, HttpCode, Logger, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBody, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';

import { JwtAuthGuard } from 'src/modules/auth/jwt.auth.guard';
import { Page } from '../../../shared/domain/entities/page.entity';
import { ErrorDto, PagedQueryDto } from '../../../shared/infrastructure/controller/dto';
import { CreateActionCommand } from '../../application/cqrs/commands/create-action.command';
import { DeleteActionCommand } from '../../application/cqrs/commands/delete-action.command';
import { PrepareAttackCommand } from '../../application/cqrs/commands/prepare-attack.command';
import { ResolveMovementCommand } from '../../application/cqrs/commands/resolve-movement.command';
import { UpdateActionCommand } from '../../application/cqrs/commands/update-action.command';
import { GetActionQuery } from '../../application/cqrs/queries/get-action.query';
import { GetActionsQuery } from '../../application/cqrs/queries/get-actions.query';
import { Action } from '../../domain/entities/action.aggregate';
import { ActionDto, ActionPageDto } from './dto/action.dto';
import { CreateActionDto } from './dto/create-action.dto';
import { PrepareAttackDto } from './dto/prepare-attack.dto';
import { ResolveMovementRequestDto } from './dto/resolve-movement.dto';
import { UpdateActionDto } from './dto/update-action.dto';

@UseGuards(JwtAuthGuard)
@Controller('v1/actions')
@ApiTags('Actions')
export class ActionController {
  private readonly logger = new Logger(ActionController.name);

  constructor(
    private commandBus: CommandBus,
    private queryBus: QueryBus,
  ) {}

  @Get(':id')
  @ApiOkResponse({ type: ActionDto, description: 'Success' })
  @ApiOperation({ operationId: 'findActionById', summary: 'Find action by id' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  @ApiNotFoundResponse({ description: 'Realm not found', type: ErrorDto })
  async findById(@Param('id') id: string, @Request() req) {
    const user = req.user!;
    const query = new GetActionQuery(id, user.id as string, user.roles as string[]);
    const entity = await this.queryBus.execute<GetActionQuery, Action>(query);
    this.logger.debug(`Action found: ${JSON.stringify(entity)}`);
    return ActionDto.fromEntity(entity);
  }

  @Get('')
  @ApiOkResponse({ type: ActionPageDto, description: 'Success' })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing authentication token',
    type: ErrorDto,
  })
  @ApiOperation({ operationId: 'findActions', summary: 'Find actions by RSQL' })
  async find(@Query() dto: PagedQueryDto, @Request() req) {
    this.logger.debug(`Finding actions with query: ${JSON.stringify(dto)}`);
    const user = req.user!;
    const query = new GetActionsQuery(dto.q, dto.page, dto.size, user.id as string, user.roles as string[]);
    const page = await this.queryBus.execute<GetActionsQuery, Page<Action>>(query);
    const mapped = page.content.map((action) => ActionDto.fromEntity(action));
    return new Page<ActionDto>(mapped, page.pagination.page, page.pagination.size, page.pagination.totalElements);
  }

  @Post('')
  @ApiBody({ type: CreateActionDto })
  @ApiOperation({ operationId: 'createAction', summary: 'Create a new action' })
  @ApiOkResponse({ type: ActionDto, description: 'Success' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  @ApiResponse({ status: 400, description: 'Bad request, invalid data', type: ErrorDto })
  async create(@Body() dto: CreateActionDto, @Request() req) {
    this.logger.debug(`Creating action: ${JSON.stringify(dto)} for user ${req.user}`);
    const user = req.user!;
    const command = CreateActionDto.toCommand(dto, user.id as string, user.roles as string[]);
    const entity = await this.commandBus.execute<CreateActionCommand, Action>(command);
    return ActionDto.fromEntity(entity);
  }

  @Patch(':id')
  @ApiOperation({ operationId: 'updateAction', summary: 'Update action' })
  @ApiOkResponse({ type: ActionDto, description: 'Success' })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing authentication token',
    type: ErrorDto,
  })
  async updateSettings(@Param('id') id: string, @Body() dto: UpdateActionDto, @Request() req) {
    const user = req.user!;
    const command = UpdateActionDto.toCommand(id, dto, user.id as string, user.roles as string[]);
    const entity = await this.commandBus.execute<UpdateActionCommand, Action>(command);
    return ActionDto.fromEntity(entity);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ operationId: 'deleteAction', summary: 'Delete action by id' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  @ApiNotFoundResponse({ description: 'Action not found', type: ErrorDto })
  async delete(@Param('id') id: string, @Request() req) {
    const user = req.user!;
    const command = new DeleteActionCommand(id, user.id as string, user.roles as string[]);
    await this.commandBus.execute(command);
  }

  @Patch(':id/resolve/movement')
  @ApiBody({ type: PrepareAttackDto })
  @ApiOperation({ operationId: 'resolveMovement', summary: 'Resolve movement' })
  @ApiOkResponse({ type: ActionDto, description: 'Success' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  @ApiResponse({ status: 400, description: 'Bad request, invalid data', type: ErrorDto })
  async resolveMovement(@Param('id') id: string, @Body() dto: ResolveMovementRequestDto, @Request() req) {
    this.logger.debug(`Resolving movement: ${JSON.stringify(dto)} for user ${req.user}`);
    const user = req.user!;
    const command = ResolveMovementRequestDto.toCommand(id, dto, user.id as string, user.roles as string[]);
    const entity = await this.commandBus.execute<ResolveMovementCommand, Action>(command);
    return ActionDto.fromEntity(entity);
  }

  @Patch(':id/prepare/attack')
  @ApiBody({ type: PrepareAttackDto })
  @ApiOperation({ operationId: 'prepareAttack', summary: 'Prepare attack' })
  @ApiOkResponse({ type: ActionDto, description: 'Success' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  @ApiResponse({ status: 400, description: 'Bad request, invalid data', type: ErrorDto })
  async prepareAttack(@Param('id') id: string, @Body() dto: PrepareAttackDto, @Request() req) {
    this.logger.debug(`Preparing attack: ${JSON.stringify(dto)} for user ${req.user}`);
    const user = req.user!;
    const command = PrepareAttackDto.toCommand(id, dto, user.id as string, user.roles as string[]);
    const entity = await this.commandBus.execute<PrepareAttackCommand, Action>(command);
    return ActionDto.fromEntity(entity);
  }
}
