import { Body, Controller, Logger, Param, Patch, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../shared/infrastructure/security/jwt-auth.guard';
import { ApplyAttackCommand } from '../../application/cqrs/commands/apply-attack.command';
import { DeclareParryCommand } from '../../application/cqrs/commands/declare-parry.command';
import { PrepareAttackCommand } from '../../application/cqrs/commands/prepare-attack.command';
import { UpdateAttackRollCommand } from '../../application/cqrs/commands/update-attack-roll.command';
import { UpdateCriticalRollCommand } from '../../application/cqrs/commands/update-critical-roll.command';
import { UpdateFumbleRollCommand } from '../../application/cqrs/commands/update-fumble-roll.command';
import { Action } from '../../domain/aggregates/action';
import { ActionDto } from './dto/action.dto';
import { DeclareParryDto } from './dto/declare-parry.dto';
import { PrepareAttackDto } from './dto/prepare-attack.dto';
import { UpdateAttackRollDto } from './dto/update-attack-roll.dto';
import { UpdateCriticalRollDto } from './dto/update-critical-roll.dto';
import { UpdateFumbleRollDto } from './dto/update-fumble-roll.dto';
import { ApiErrors } from '../../../shared/interfaces/http/api-errors.decorator';
import { CurrentUser } from '../../../shared/interfaces/http/current-user.decorator';
import type { AuthenticatedUser } from '../../../shared/interfaces/http/authenticated-request';

@UseGuards(JwtAuthGuard)
@Controller('v1/actions')
@ApiTags('Actions')
export class AttackController {
  private readonly logger = new Logger(AttackController.name);

  constructor(private commandBus: CommandBus) {}

  @Patch(':id/attack/prepare')
  @ApiBody({ type: PrepareAttackDto })
  @ApiOperation({ operationId: 'prepareAttack', summary: 'Prepare attack' })
  @ApiOkResponse({ type: ActionDto, description: 'Success' })
  @ApiErrors({ 400: 'Bad request, invalid data' })
  async prepareAttack(@Param('id') id: string, @Body() dto: PrepareAttackDto, @CurrentUser() user: AuthenticatedUser) {
    this.logger.debug(`Preparing attack: ${JSON.stringify(dto)} for user ${user.id}`);
    const command = PrepareAttackDto.toCommand(id, dto, user.id, user.roles);
    const entity = await this.commandBus.execute<PrepareAttackCommand, Action>(command);
    return ActionDto.fromEntity(entity);
  }

  @Patch(':id/attack/parry')
  @ApiBody({ type: DeclareParryDto })
  @ApiOperation({ operationId: 'declareParry', summary: 'Declare parry' })
  @ApiOkResponse({ type: ActionDto, description: 'Success' })
  @ApiErrors({ 400: 'Bad request, invalid data' })
  async declareParry(@Param('id') id: string, @Body() dto: DeclareParryDto, @CurrentUser() user: AuthenticatedUser) {
    this.logger.debug(`Declaring parry: ${JSON.stringify(dto)} for user ${user.id}`);
    const command = DeclareParryDto.toCommand(id, dto, user.id, user.roles);
    const entity = await this.commandBus.execute<DeclareParryCommand, Action>(command);
    return ActionDto.fromEntity(entity);
  }

  @Patch(':id/attack/roll')
  @ApiBody({ type: UpdateAttackRollDto })
  @ApiOperation({ operationId: 'updateAttackRoll', summary: 'Update attack roll' })
  @ApiOkResponse({ type: ActionDto, description: 'Success' })
  @ApiErrors({ 400: 'Bad request, invalid data' })
  async updateAttackRoll(@Param('id') id: string, @Body() dto: UpdateAttackRollDto, @CurrentUser() user: AuthenticatedUser) {
    this.logger.debug(`Updating attack roll: ${JSON.stringify(dto)} for user ${user.id}`);
    const command = UpdateAttackRollDto.toCommand(id, dto, user.id, user.roles);
    const entity = await this.commandBus.execute<UpdateAttackRollCommand, Action>(command);
    return ActionDto.fromEntity(entity);
  }

  @Patch(':id/attack/critical-roll')
  @ApiBody({ type: UpdateCriticalRollDto })
  @ApiOperation({ operationId: 'updateCriticalRoll', summary: 'Update critical roll' })
  @ApiOkResponse({ type: ActionDto, description: 'Success' })
  @ApiErrors({ 400: 'Bad request, invalid data' })
  async updateCriticalRoll(@Param('id') id: string, @Body() dto: UpdateCriticalRollDto, @CurrentUser() user: AuthenticatedUser) {
    this.logger.debug(`Updating critical roll: ${JSON.stringify(dto)} for user ${user.id}`);
    const command = UpdateCriticalRollDto.toCommand(id, dto, user.id, user.roles);
    const entity = await this.commandBus.execute<UpdateCriticalRollCommand, Action>(command);
    return ActionDto.fromEntity(entity);
  }

  @Patch(':id/attack/fumble-roll')
  @ApiBody({ type: UpdateFumbleRollDto })
  @ApiOperation({ operationId: 'updateFumbleRoll', summary: 'Update fumble roll' })
  @ApiOkResponse({ type: ActionDto, description: 'Success' })
  @ApiErrors({ 400: 'Bad request, invalid data' })
  async updateFumbleRoll(@Param('id') id: string, @Body() dto: UpdateFumbleRollDto, @CurrentUser() user: AuthenticatedUser) {
    this.logger.debug(`Updating fumble roll: ${JSON.stringify(dto)} for user ${user.id}`);
    const command = UpdateFumbleRollDto.toCommand(id, dto, user.id, user.roles);
    const entity = await this.commandBus.execute<UpdateFumbleRollCommand, Action>(command);
    return ActionDto.fromEntity(entity);
  }

  @Patch(':id/attack/apply')
  @ApiOperation({ operationId: 'applyAttack', summary: 'Apply attack' })
  @ApiOkResponse({ type: ActionDto, description: 'Success' })
  @ApiErrors({ 400: 'Bad request, invalid data' })
  async applyAttack(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    this.logger.debug(`Applying attack ${id} for user ${user.id}`);
    const command = new ApplyAttackCommand(id, user.id, user.roles);
    const entity = await this.commandBus.execute<ApplyAttackCommand, Action>(command);
    return ActionDto.fromEntity(entity);
  }
}
