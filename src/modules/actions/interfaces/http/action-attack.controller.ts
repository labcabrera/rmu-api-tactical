/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Body, Controller, Logger, Param, Patch, Request, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiBody, ApiOkResponse, ApiOperation, ApiResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/jwt.auth.guard';
import { ErrorDto } from '../../../shared/interfaces/http/dto';
import { DeclareParryCommand } from '../../application/cqrs/commands/declare-parry.command';
import { PrepareAttackCommand } from '../../application/cqrs/commands/prepare-attack.command';
import { UpdateAttackRollCommand } from '../../application/cqrs/commands/update-attack-roll.command';
import { UpdateCriticalRollCommand } from '../../application/cqrs/commands/update-critical-roll.command';
import { Action } from '../../domain/aggregates/action.aggregate';
import { ActionDto } from './dto/action.dto';
import { DeclareParryDto } from './dto/declare-parry.dto';
import { PrepareAttackDto } from './dto/prepare-attack.dto';
import { UpdateAttackRollDto } from './dto/update-attack-roll.dto';
import { UpdateCriticalRollDto } from './dto/update-critical-roll.dto';

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
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  @ApiResponse({ status: 400, description: 'Bad request, invalid data', type: ErrorDto })
  async prepareAttack(@Param('id') id: string, @Body() dto: PrepareAttackDto, @Request() req) {
    this.logger.debug(`Preparing attack: ${JSON.stringify(dto)} for user ${req.user}`);
    const user = req.user!;
    const command = PrepareAttackDto.toCommand(id, dto, user.id as string, user.roles as string[]);
    const entity = await this.commandBus.execute<PrepareAttackCommand, Action>(command);
    return ActionDto.fromEntity(entity);
  }

  @Patch(':id/attack/parry')
  @ApiBody({ type: DeclareParryDto })
  @ApiOperation({ operationId: 'declareParry', summary: 'Declare parry' })
  @ApiOkResponse({ type: ActionDto, description: 'Success' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  @ApiResponse({ status: 400, description: 'Bad request, invalid data', type: ErrorDto })
  async declareParry(@Param('id') id: string, @Body() dto: DeclareParryDto, @Request() req) {
    this.logger.debug(`Declaring parry: ${JSON.stringify(dto)} for user ${req.user}`);
    const user = req.user!;
    const command = DeclareParryDto.toCommand(id, dto, user.id as string, user.roles as string[]);
    const entity = await this.commandBus.execute<DeclareParryCommand, Action>(command);
    return ActionDto.fromEntity(entity);
  }

  @Patch(':id/attack/roll')
  @ApiBody({ type: UpdateAttackRollDto })
  @ApiOperation({ operationId: 'updateAttackRoll', summary: 'Update attack roll' })
  @ApiOkResponse({ type: ActionDto, description: 'Success' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  @ApiResponse({ status: 400, description: 'Bad request, invalid data', type: ErrorDto })
  async updateAttackRoll(@Param('id') id: string, @Body() dto: UpdateAttackRollDto, @Request() req) {
    this.logger.debug(`Updating attack roll: ${JSON.stringify(dto)} for user ${req.user}`);
    const user = req.user!;
    const command = UpdateAttackRollDto.toCommand(id, dto, user.id as string, user.roles as string[]);
    const entity = await this.commandBus.execute<UpdateAttackRollCommand, Action>(command);
    return ActionDto.fromEntity(entity);
  }

  @Patch(':id/attack/critical-roll')
  @ApiBody({ type: UpdateCriticalRollDto })
  @ApiOperation({ operationId: 'updateCriticalRoll', summary: 'Update critical roll' })
  @ApiOkResponse({ type: ActionDto, description: 'Success' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  @ApiResponse({ status: 400, description: 'Bad request, invalid data', type: ErrorDto })
  async updateCriticalRoll(@Param('id') id: string, @Body() dto: UpdateCriticalRollDto, @Request() req) {
    this.logger.debug(`Updating critical roll: ${JSON.stringify(dto)} for user ${req.user}`);
    const user = req.user!;
    const command = UpdateCriticalRollDto.toCommand(id, dto, user.id as string, user.roles as string[]);
    const entity = await this.commandBus.execute<UpdateCriticalRollCommand, Action>(command);
    return ActionDto.fromEntity(entity);
  }
}
