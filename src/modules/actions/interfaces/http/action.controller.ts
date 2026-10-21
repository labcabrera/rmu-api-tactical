/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Body, Controller, Delete, Get, HttpCode, Logger, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBody, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/jwt.auth.guard';
import { Page } from '../../../shared/domain/entities/page.entity';
import { ErrorDto, PagedQueryDto } from '../../../shared/interfaces/http/dto';
import { CompleteActionCommand } from '../../application/cqrs/commands/complete-action.command';
import { CreateActionCommand } from '../../application/cqrs/commands/create-action.command';
import { DeleteActionCommand } from '../../application/cqrs/commands/delete-action.command';
import { ManageActionPointsCommand } from '../../application/cqrs/commands/manage-action-points.command';
import { UpdateActionCommand } from '../../application/cqrs/commands/update-action.command';
import { GetActionQuery } from '../../application/cqrs/queries/get-action.query';
import { GetActionsQuery } from '../../application/cqrs/queries/get-actions.query';
import { Action } from '../../domain/aggregates/action.aggregate';
import { ActionDto, ActionPageDto } from './dto/action.dto';
import { CompleteActionDto } from './dto/complete-action.dto';
import { CreateActionDto } from './dto/create-action.dto';
import { ForceResolutionDto } from './dto/force-action.dto';
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
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  @ApiOperation({ operationId: 'findActions', summary: 'Find actions by RSQL' })
  async find(@Query() dto: PagedQueryDto, @Request() req) {
    this.logger.debug(`Finding actions with query: ${JSON.stringify(dto)}`);
    const user = req.user!;
    const query = new GetActionsQuery(dto.q, dto.page, dto.size, user.id as string, user.roles as string[]);
    const page = await this.queryBus.execute<GetActionsQuery, Page<Action>>(query);
    const mapped = page.content.map(action => ActionDto.fromEntity(action));
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
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
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

  @Patch(':id/complete')
  @ApiBody({ type: CompleteActionDto })
  @ApiOperation({ operationId: 'completeAction', summary: 'Complete an action without rolls (stand up, dodge, draw and load, other)' })
  @ApiOkResponse({ type: ActionDto, description: 'Success' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  @ApiResponse({ status: 400, description: 'Bad request, invalid data', type: ErrorDto })
  async complete(@Param('id') id: string, @Body() dto: CompleteActionDto, @Request() req) {
    const user = req.user!;
    const command = CompleteActionDto.toCommand(id, dto, user.id as string, user.roles as string[]);
    const entity = await this.commandBus.execute<CompleteActionCommand, Action>(command);
    return ActionDto.fromEntity(entity);
  }

  @Patch(':id/spend-ap')
  @ApiOperation({ operationId: 'spendActionPoint', summary: 'Spend one more AP of the current phase on an open action' })
  @ApiOkResponse({ type: ActionDto, description: 'Success' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  @ApiResponse({ status: 400, description: 'No AP left in the phase, or the action is not open', type: ErrorDto })
  async spendActionPoint(@Param('id') id: string, @Request() req) {
    const user = req.user!;
    const command = new ManageActionPointsCommand(id, 'spend-ap', user.id as string, user.roles as string[]);
    const entity = await this.commandBus.execute<ManageActionPointsCommand, Action>(command);
    return ActionDto.fromEntity(entity);
  }

  @Patch(':id/hold')
  @ApiOperation({ operationId: 'holdAction', summary: 'Hold an action that has its maximum AP, to trigger it later' })
  @ApiOkResponse({ type: ActionDto, description: 'Success' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  @ApiResponse({ status: 400, description: 'The action is not open or has fewer AP than its maximum', type: ErrorDto })
  async hold(@Param('id') id: string, @Request() req) {
    const user = req.user!;
    const command = new ManageActionPointsCommand(id, 'hold', user.id as string, user.roles as string[]);
    const entity = await this.commandBus.execute<ManageActionPointsCommand, Action>(command);
    return ActionDto.fromEntity(entity);
  }

  @Patch(':id/force')
  @ApiBody({ type: ForceResolutionDto })
  @ApiOperation({ operationId: 'forceAction', summary: 'Resolve an open action out of turn (withdrawal, pass-through, effect, gm)' })
  @ApiOkResponse({ type: ActionDto, description: 'Success' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  @ApiResponse({ status: 400, description: 'Bad request, invalid data', type: ErrorDto })
  async force(@Param('id') id: string, @Body() dto: ForceResolutionDto, @Request() req) {
    const user = req.user!;
    const command = ForceResolutionDto.toCommand(id, dto, user.id as string, user.roles as string[]);
    const entity = await this.commandBus.execute<ManageActionPointsCommand, Action>(command);
    return ActionDto.fromEntity(entity);
  }
}
