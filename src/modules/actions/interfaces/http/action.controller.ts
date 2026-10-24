import { Body, Controller, Delete, Get, HttpCode, Logger, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../shared/infrastructure/security/jwt-auth.guard.js';
import { Page } from '../../../shared/application/pagination/page.js';
import { PagedQueryDto } from '../../../shared/interfaces/http/dto/paged-rsql-query.js';
import { CompleteActionCommand } from '../../application/cqrs/commands/complete-action.command.js';
import { CreateActionCommand } from '../../application/cqrs/commands/create-action.command.js';
import { DeleteActionCommand } from '../../application/cqrs/commands/delete-action.command.js';
import { ManageActionPointsCommand } from '../../application/cqrs/commands/manage-action-points.command.js';
import { UpdateActionCommand } from '../../application/cqrs/commands/update-action.command.js';
import { GetActionQuery } from '../../application/cqrs/queries/get-action.query.js';
import { GetActionsQuery } from '../../application/cqrs/queries/get-actions.query.js';
import { Action } from '../../domain/aggregates/action.js';
import { ActionDto, ActionPageDto } from './dto/action.dto.js';
import { CompleteActionDto } from './dto/complete-action.dto.js';
import { CreateActionDto } from './dto/create-action.dto.js';
import { ForceResolutionDto } from './dto/force-action.dto.js';
import { UpdateActionDto } from './dto/update-action.dto.js';
import { ApiErrors } from '../../../shared/interfaces/http/api-errors.decorator.js';
import { CurrentUser } from '../../../shared/interfaces/http/current-user.decorator.js';
import type { AuthenticatedUser } from '../../../shared/interfaces/http/authenticated-request.js';

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
  @ApiErrors({ 404: 'Realm not found' })
  async findById(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    const query = new GetActionQuery(id, user.id, user.roles);
    const entity = await this.queryBus.execute<GetActionQuery, Action>(query);
    this.logger.debug(`Action found: ${JSON.stringify(entity)}`);
    return ActionDto.fromEntity(entity);
  }

  @Get('')
  @ApiOkResponse({ type: ActionPageDto, description: 'Success' })
  @ApiErrors()
  @ApiOperation({ operationId: 'findActions', summary: 'Find actions by RSQL' })
  async find(@Query() dto: PagedQueryDto, @CurrentUser() user: AuthenticatedUser) {
    this.logger.debug(`Finding actions with query: ${JSON.stringify(dto)}`);
    const query = new GetActionsQuery(dto.q, dto.page, dto.size, user.id, user.roles);
    const page = await this.queryBus.execute<GetActionsQuery, Page<Action>>(query);
    const mapped = page.content.map(action => ActionDto.fromEntity(action));
    return new Page<ActionDto>(mapped, page.pagination.page, page.pagination.size, page.pagination.totalElements);
  }

  @Post('')
  @ApiBody({ type: CreateActionDto })
  @ApiOperation({ operationId: 'createAction', summary: 'Create a new action' })
  @ApiOkResponse({ type: ActionDto, description: 'Success' })
  @ApiErrors({ 400: 'Bad request, invalid data' })
  async create(@Body() dto: CreateActionDto, @CurrentUser() user: AuthenticatedUser) {
    this.logger.debug(`Creating action: ${JSON.stringify(dto)} for user ${user.id}`);
    const command = CreateActionDto.toCommand(dto, user.id, user.roles);
    const entity = await this.commandBus.execute<CreateActionCommand, Action>(command);
    return ActionDto.fromEntity(entity);
  }

  @Patch(':id')
  @ApiOperation({ operationId: 'updateAction', summary: 'Update action' })
  @ApiOkResponse({ type: ActionDto, description: 'Success' })
  @ApiErrors()
  async updateSettings(@Param('id') id: string, @Body() dto: UpdateActionDto, @CurrentUser() user: AuthenticatedUser) {
    const command = UpdateActionDto.toCommand(id, dto, user.id, user.roles);
    const entity = await this.commandBus.execute<UpdateActionCommand, Action>(command);
    return ActionDto.fromEntity(entity);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ operationId: 'deleteAction', summary: 'Delete action by id' })
  @ApiErrors({ 404: 'Action not found' })
  async delete(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    const command = new DeleteActionCommand(id, user.id, user.roles);
    await this.commandBus.execute(command);
  }

  @Patch(':id/complete')
  @ApiBody({ type: CompleteActionDto })
  @ApiOperation({ operationId: 'completeAction', summary: 'Complete an action without rolls (stand up, dodge, draw and load, other)' })
  @ApiOkResponse({ type: ActionDto, description: 'Success' })
  @ApiErrors({ 400: 'Bad request, invalid data' })
  async complete(@Param('id') id: string, @Body() dto: CompleteActionDto, @CurrentUser() user: AuthenticatedUser) {
    const command = CompleteActionDto.toCommand(id, dto, user.id, user.roles);
    const entity = await this.commandBus.execute<CompleteActionCommand, Action>(command);
    return ActionDto.fromEntity(entity);
  }

  @Patch(':id/spend-ap')
  @ApiOperation({ operationId: 'spendActionPoint', summary: 'Spend one more AP of the current phase on an open action' })
  @ApiOkResponse({ type: ActionDto, description: 'Success' })
  @ApiErrors({ 400: 'No AP left in the phase, or the action is not open' })
  async spendActionPoint(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    const command = new ManageActionPointsCommand(id, 'spend-ap', user.id, user.roles);
    const entity = await this.commandBus.execute<ManageActionPointsCommand, Action>(command);
    return ActionDto.fromEntity(entity);
  }

  @Patch(':id/hold')
  @ApiOperation({ operationId: 'holdAction', summary: 'Hold an action that has its maximum AP, to trigger it later' })
  @ApiOkResponse({ type: ActionDto, description: 'Success' })
  @ApiErrors({ 400: 'The action is not open or has fewer AP than its maximum' })
  async hold(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    const command = new ManageActionPointsCommand(id, 'hold', user.id, user.roles);
    const entity = await this.commandBus.execute<ManageActionPointsCommand, Action>(command);
    return ActionDto.fromEntity(entity);
  }

  @Patch(':id/force')
  @ApiBody({ type: ForceResolutionDto })
  @ApiOperation({ operationId: 'forceAction', summary: 'Resolve an open action out of turn (withdrawal, pass-through, effect, gm)' })
  @ApiOkResponse({ type: ActionDto, description: 'Success' })
  @ApiErrors({ 400: 'Bad request, invalid data' })
  async force(@Param('id') id: string, @Body() dto: ForceResolutionDto, @CurrentUser() user: AuthenticatedUser) {
    const command = ForceResolutionDto.toCommand(id, dto, user.id, user.roles);
    const entity = await this.commandBus.execute<ManageActionPointsCommand, Action>(command);
    return ActionDto.fromEntity(entity);
  }
}
