import { Body, Controller, Delete, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ActorRound } from '../../../actor-rounds/domain/aggregates/actor-round.js';
import { ActorRoundDto } from '../../../actor-rounds/interfaces/http/dto/actor-round.dto.js';
import { CreatePoisoningDto, GiveAntidoteDto, ResolvePoisoningDto } from '../../../actor-rounds/interfaces/http/dto/poison.dto.js';
import { ActorRoundAccess, ActorRoundAccessGuard } from '../../../actor-rounds/interfaces/http/security/actor-round-access.guard.js';
import { JwtAuthGuard } from '../../../shared/infrastructure/security/jwt-auth.guard.js';
import { ApiErrors } from '../../../shared/interfaces/http/api-errors.decorator.js';
import type { AuthenticatedUser } from '../../../shared/interfaces/http/authenticated-request.js';
import { CurrentUser } from '../../../shared/interfaces/http/current-user.decorator.js';
import {
  CreatePoisoningCommand,
  DismissPoisoningCommand,
  GiveAntidoteCommand,
  ResolvePoisoningCommand,
} from '../../application/cqrs/commands/poisoning.commands.js';
import type {
  CreatePoisoningResult,
  GiveAntidoteResult,
  ResolvePoisoningResult,
} from '../../application/cqrs/handlers/poisoning.handlers.js';
import { AntidoteResultDto, PoisonExposureResultDto, ResolvePoisoningResultDto } from './dto/poisoning-result.dto.js';

/** Poisonings of an actor (workspace spec 042): exposure, poison RR and antidote. */
@UseGuards(JwtAuthGuard, ActorRoundAccessGuard)
@Controller('v1/actor-rounds')
@ApiTags('Actor Rounds')
export class PoisoningController {
  constructor(private readonly commandBus: CommandBus) {}

  @ActorRoundAccess('act')
  @Post(':id/poisonings')
  @ApiOkResponse({ type: PoisonExposureResultDto, description: 'Success' })
  @ApiOperation({ operationId: 'createPoisoning', summary: 'A poison reaches the actor: it waits for its RR (spec 042)' })
  @ApiErrors({ 404: 'Actor round not found' })
  async create(@Param('id') id: string, @Body() dto: CreatePoisoningDto, @CurrentUser() user: AuthenticatedUser) {
    const command = new CreatePoisoningCommand(id, { ...dto.poison }, user.id, user.roles);
    const result = await this.commandBus.execute<CreatePoisoningCommand, CreatePoisoningResult>(command);
    return PoisonExposureResultDto.from(result);
  }

  @ActorRoundAccess('act')
  @Post(':id/poisonings/:exposureId/resolve')
  @HttpCode(200)
  @ApiOkResponse({ type: ResolvePoisoningResultDto, description: 'Success' })
  @ApiOperation({ operationId: 'resolvePoisoning', summary: 'Poison RR of an exposure; a failure poisons the actor (spec 042)' })
  @ApiErrors({ 400: 'No poison RR bonus for the actor', 404: 'Actor round or exposure not found' })
  async resolve(
    @Param('id') id: string,
    @Param('exposureId') exposureId: string,
    @Body() dto: ResolvePoisoningDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const command = new ResolvePoisoningCommand(id, exposureId, dto.roll, dto.modifiers ?? [], dto.bonus, user.id, user.roles);
    const result = await this.commandBus.execute<ResolvePoisoningCommand, ResolvePoisoningResult>(command);
    return ResolvePoisoningResultDto.from(result);
  }

  @ActorRoundAccess('act')
  @Delete(':id/poisonings/:exposureId')
  @ApiOkResponse({ type: ActorRoundDto, description: 'Success' })
  @ApiOperation({ operationId: 'dismissPoisoning', summary: 'Drop a poison exposure without an RR (game master)' })
  @ApiErrors({ 404: 'Actor round or exposure not found' })
  async dismiss(@Param('id') id: string, @Param('exposureId') exposureId: string, @CurrentUser() user: AuthenticatedUser) {
    const command = new DismissPoisoningCommand(id, exposureId, user.id, user.roles);
    const entity = await this.commandBus.execute<DismissPoisoningCommand, ActorRound>(command);
    return ActorRoundDto.fromEntity(entity);
  }

  @ActorRoundAccess('act')
  @Post(':id/injuries/:injuryId/antidote')
  @HttpCode(200)
  @ApiOkResponse({ type: AntidoteResultDto, description: 'Success' })
  @ApiOperation({ operationId: 'giveAntidote', summary: 'Give an antidote for a poisoning (spec 042)' })
  @ApiErrors({ 400: 'The injury is not a poisoning', 404: 'Actor round or injury not found' })
  async antidote(
    @Param('id') id: string,
    @Param('injuryId') injuryId: string,
    @Body() dto: GiveAntidoteDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const command = new GiveAntidoteCommand(id, injuryId, { ...dto }, user.id, user.roles);
    const result = await this.commandBus.execute<GiveAntidoteCommand, GiveAntidoteResult>(command);
    return AntidoteResultDto.from(result);
  }
}
