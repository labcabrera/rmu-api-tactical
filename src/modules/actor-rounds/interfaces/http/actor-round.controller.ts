import { Body, Controller, Delete, Get, HttpCode, Logger, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../shared/infrastructure/security/jwt-auth.guard.js';
import { Page } from '../../../shared/application/pagination/page.js';
import { PagedQueryDto } from '../../../shared/interfaces/http/dto/paged-rsql-query.js';
import { AddEffectsCommand } from '../../application/cqrs/commands/add-effects.command.js';
import { AddFatigueCommand } from '../../application/cqrs/commands/add-fatigue.command.js';
import { AdjustHpCommand } from '../../application/cqrs/commands/adjust-hp.command.js';
import { DeleteInjuryCommand } from '../../application/cqrs/commands/delete-injury.command.js';
import { StabilizeEffectCommand } from '../../application/cqrs/commands/stabilize-effect.command.js';
import { TreatInjuryCommand } from '../../application/cqrs/commands/treat-injury.command.js';
import { UpdateInjuryCommand } from '../../application/cqrs/commands/update-injury.command.js';
import type { StabilizeEffectResult } from '../../application/cqrs/handlers/stabilize-effect.handler.js';
import type { TreatInjuryResult } from '../../application/cqrs/handlers/treat-injury.handler.js';
import { DeclareDefenseModeCommand } from '../../application/cqrs/commands/declare-defense-mode.command.js';
import { DeclareInitiativeCommand } from '../../application/cqrs/commands/declare-initiative.command.js';
import { DeleteEffectCommand } from '../../application/cqrs/commands/delete-effect.command.js';
import { ResolveAlertCommand } from '../../application/cqrs/commands/resolve-alert.command.js';
import { ResolveEnduranceCheckCommand } from '../../application/cqrs/commands/resolve-endurance-check.command.js';
import { GetActorRoundQuery } from '../../application/cqrs/queries/get-actor-round.query.js';
import { GetActorsRoundsQuery } from '../../application/cqrs/queries/get-actor-rounds.query.js';
import { ActorRound } from '../../domain/aggregates/actor-round.js';
import { DeclareDefenseModeDto } from './dto/actor-round-defense-mode.dto.js';
import { DeclareFightingStyleDto } from './dto/actor-round-fighting-style.dto.js';
import { DeclareFightingStyleCommand } from '../../application/cqrs/commands/declare-fighting-style.command.js';
import { ActorRoundDto, CharacterRoundPageDto } from './dto/actor-round.dto.js';
import { AddEffectDto } from './dto/add-effect.dto.js';
import { AddFatigueAccumulatorDto } from './dto/add-fatigue-accumulator.dto.js';
import { AddHpDto } from './dto/add-hp.dto.js';
import { DeclareInitiativeDto } from './dto/declare-initiative.dto.js';
import { ResolveEnduranceCheckDto } from './dto/resolve-endurance-check.dto.js';
import { ResolveBreakageCheckDto } from './dto/resolve-breakage-check.dto.js';
import { ResolveBreakageCheckCommand } from '../../application/cqrs/commands/resolve-breakage-check.command.js';
import { MedicalResultDto, MedicalRollDto, TreatInjuryDto, UpdateInjuryDto } from './dto/treat-injury.dto.js';
import { ApiErrors } from '../../../shared/interfaces/http/api-errors.decorator.js';
import { CurrentUser } from '../../../shared/interfaces/http/current-user.decorator.js';
import type { AuthenticatedUser } from '../../../shared/interfaces/http/authenticated-request.js';
import { ActorRoundAccess, ActorRoundAccessGuard } from './security/actor-round-access.guard.js';

@UseGuards(JwtAuthGuard, ActorRoundAccessGuard)
@Controller('v1/actor-rounds')
@ApiTags('Actor Rounds')
export class ActorRoundController {
  private readonly logger = new Logger(ActorRoundController.name);

  constructor(
    private commandBus: CommandBus,
    private queryBus: QueryBus,
  ) {}

  @ActorRoundAccess('read')
  @Get(':id')
  @ApiOkResponse({ type: ActorRoundDto, description: 'Success' })
  @ApiOperation({ operationId: 'findActorRoundById', summary: 'Find actor round by id' })
  @ApiErrors({ 404: 'Actor round not found' })
  async findById(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    const query = new GetActorRoundQuery(id, user.id, user.roles);
    const entity = await this.queryBus.execute<GetActorRoundQuery, ActorRound>(query);
    this.logger.debug(`Actor round found: ${JSON.stringify(entity)}`);
    return ActorRoundDto.fromEntity(entity);
  }

  @Get('')
  @ApiOkResponse({ type: CharacterRoundPageDto, description: 'Success' })
  @ApiErrors()
  @ApiOperation({ operationId: 'findActorRounds', summary: 'Find actor rounds by RSQL' })
  async find(@Query() dto: PagedQueryDto, @CurrentUser() user: AuthenticatedUser) {
    this.logger.debug(`Finding actor rounds with query: ${JSON.stringify(dto)}`);
    const query = new GetActorsRoundsQuery(dto.q, dto.page, dto.size, user.id, user.roles);
    const page = await this.queryBus.execute<GetActorsRoundsQuery, Page<ActorRound>>(query);
    const mapped = page.content.map(actorRound => ActorRoundDto.fromEntity(actorRound));
    return new Page<ActorRoundDto>(mapped, page.pagination.page, page.pagination.size, page.pagination.totalElements);
  }

  @ActorRoundAccess('act')
  @Patch(':id/initiative')
  @ApiOkResponse({ type: ActorRoundDto, description: 'Success' })
  @ApiOperation({ operationId: 'declareInitiative', summary: 'Declare initiative' })
  @ApiErrors({ 404: 'Actor round not found' })
  async declareInitiative(@Param('id') id: string, @Body() dto: DeclareInitiativeDto, @CurrentUser() user: AuthenticatedUser) {
    const command = DeclareInitiativeDto.toCommand(id, dto, user.id, user.roles);
    const entity = await this.commandBus.execute<DeclareInitiativeCommand, ActorRound>(command);
    return ActorRoundDto.fromEntity(entity);
  }

  @ActorRoundAccess('act')
  @Patch(':id/defense-mode')
  @ApiOkResponse({ type: ActorRoundDto, description: 'Success' })
  @ApiOperation({ operationId: 'declareDefenseMode', summary: 'Declare the dodge and shield block of the round' })
  @ApiErrors({ 404: 'Actor round not found' })
  async declareDefenseMode(@Param('id') id: string, @Body() dto: DeclareDefenseModeDto, @CurrentUser() user: AuthenticatedUser) {
    const command = DeclareDefenseModeDto.toCommand(id, dto, user.id, user.roles);
    const entity = await this.commandBus.execute<DeclareDefenseModeCommand, ActorRound>(command);
    return ActorRoundDto.fromEntity(entity);
  }

  @ActorRoundAccess('act')
  @Patch(':id/fighting-style')
  @ApiOkResponse({ type: ActorRoundDto, description: 'Success' })
  @ApiOperation({
    operationId: 'declareFightingStyle',
    summary: 'Declare the fighting style the actor fights with (spec 032), or none',
    description: 'Checked against the equipment of the actor; kept in the next rounds until it changes.',
  })
  @ApiErrors({ 400: 'The actor has no ranks in the style, or an invalid option', 404: 'Actor round not found' })
  async declareFightingStyle(@Param('id') id: string, @Body() dto: DeclareFightingStyleDto, @CurrentUser() user: AuthenticatedUser) {
    const command = DeclareFightingStyleDto.toCommand(id, dto, user.id, user.roles);
    const entity = await this.commandBus.execute<DeclareFightingStyleCommand, ActorRound>(command);
    return ActorRoundDto.fromEntity(entity);
  }

  @ActorRoundAccess('act')
  @Patch(':id/hp')
  @ApiOkResponse({ type: ActorRoundDto, description: 'Success' })
  @ApiOperation({ operationId: 'addHp', summary: 'Take (dmg > 0) or heal (dmg < 0) hits, up to the maximum' })
  @ApiErrors({ 404: 'Actor round not found' })
  async addHp(@Param('id') id: string, @Body() dto: AddHpDto, @CurrentUser() user: AuthenticatedUser) {
    const command = new AdjustHpCommand(id, dto.dmg, user.id, user.roles);
    const entity = await this.commandBus.execute<AdjustHpCommand, ActorRound>(command);
    return ActorRoundDto.fromEntity(entity);
  }

  @ActorRoundAccess('act')
  @Patch(':id/fatigue-accumulator')
  @ApiOkResponse({ type: ActorRoundDto, description: 'Success' })
  @ApiOperation({ operationId: 'addFatigueAccumulator', summary: 'Add or subtract fatigue accumulator' })
  @ApiErrors({ 404: 'Actor round not found' })
  async addFatigueAccumulator(@Param('id') id: string, @Body() dto: AddFatigueAccumulatorDto, @CurrentUser() user: AuthenticatedUser) {
    const command = AddFatigueAccumulatorDto.toCommand(id, dto, user.id, user.roles);
    const entity = await this.commandBus.execute<AddFatigueCommand, ActorRound>(command);
    return ActorRoundDto.fromEntity(entity);
  }

  @ActorRoundAccess('act')
  @Patch(':id/endurance-check')
  @ApiOkResponse({ type: ActorRoundDto, description: 'Success' })
  @ApiOperation({ operationId: 'resolveEnduranceCheck', summary: 'Resolve an endurance roll and apply its fatigue and hits' })
  @ApiErrors({ 404: 'Actor round not found' })
  async resolveEnduranceCheck(@Param('id') id: string, @Body() dto: ResolveEnduranceCheckDto, @CurrentUser() user: AuthenticatedUser) {
    const command = ResolveEnduranceCheckDto.toCommand(id, dto, user.id, user.roles);
    const entity = await this.commandBus.execute<ResolveEnduranceCheckCommand, ActorRound>(command);
    return ActorRoundDto.fromEntity(entity);
  }

  @ActorRoundAccess('act')
  @Post(':id/breakage-checks')
  @HttpCode(200)
  @ApiOkResponse({ type: ActorRoundDto, description: 'Success, with the result in lastBreakageCheck' })
  @ApiOperation({ operationId: 'resolveBreakageCheck', summary: 'Resolve a breakage check of an item of the actor (spec 019)' })
  @ApiErrors({ 404: 'Actor round, item or alert not found' })
  async resolveBreakageCheck(@Param('id') id: string, @Body() dto: ResolveBreakageCheckDto, @CurrentUser() user: AuthenticatedUser) {
    const command = ResolveBreakageCheckDto.toCommand(id, dto, user.id, user.roles);
    const entity = await this.commandBus.execute<ResolveBreakageCheckCommand, ActorRound>(command);
    return ActorRoundDto.fromEntity(entity);
  }

  @ActorRoundAccess('act')
  @Post(':id/effects')
  @ApiOkResponse({ type: ActorRoundDto, description: 'Success' })
  @ApiOperation({ operationId: 'addEffect', summary: 'Add effect' })
  @ApiErrors({ 404: 'Actor round not found' })
  async addEffect(@Param('id') id: string, @Body() dto: AddEffectDto, @CurrentUser() user: AuthenticatedUser) {
    const command = AddEffectDto.toCommand(id, dto, user.id, user.roles);
    const entity = await this.commandBus.execute<AddEffectsCommand, ActorRound>(command);
    return ActorRoundDto.fromEntity(entity);
  }

  @ActorRoundAccess('act')
  @Delete(':id/effects/:effectId')
  @ApiOkResponse({ type: ActorRoundDto, description: 'Success' })
  @ApiOperation({ operationId: 'deleteEffect', summary: 'Delete effect' })
  @ApiErrors({ 404: 'Actor round not found' })
  async deleteEffect(@Param('id') id: string, @Param('effectId') effectId: string, @CurrentUser() user: AuthenticatedUser) {
    const command = new DeleteEffectCommand(id, effectId, user.id, user.roles);
    const entity = await this.commandBus.execute<DeleteEffectCommand, ActorRound>(command);
    return ActorRoundDto.fromEntity(entity);
  }

  @ActorRoundAccess('act')
  @Post(':id/alerts/:alertId/resolve')
  @HttpCode(200)
  @ApiOkResponse({ type: ActorRoundDto, description: 'Success' })
  @ApiOperation({ operationId: 'resolveAlert', summary: 'Resolve an alert handled by hand (the critical of a fumble)' })
  @ApiErrors({ 404: 'Actor round or alert not found', 400: 'The alert is resolved with its roll' })
  async resolveAlert(@Param('id') id: string, @Param('alertId') alertId: string, @CurrentUser() user: AuthenticatedUser) {
    const command = new ResolveAlertCommand(id, alertId, user.id, user.roles);
    const entity = await this.commandBus.execute<ResolveAlertCommand, ActorRound>(command);
    return ActorRoundDto.fromEntity(entity);
  }

  @ActorRoundAccess('act')
  @Post(':id/injuries/:injuryId/treatments')
  @HttpCode(200)
  @ApiOkResponse({ type: MedicalResultDto, description: 'Success' })
  @ApiOperation({ operationId: 'treatInjury', summary: 'Treat an injury with a Medicine roll of a healer (spec 013)' })
  @ApiErrors({ 404: 'Actor round or injury not found' })
  async treatInjury(
    @Param('id') id: string,
    @Param('injuryId') injuryId: string,
    @Body() dto: TreatInjuryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const command = new TreatInjuryCommand(
      id,
      injuryId,
      dto.procedure,
      { healerActorId: dto.healerActorId, healer: dto.healer },
      dto.roll,
      dto.difficulty,
      user.id,
      user.roles,
      { unmodifiedRoll: dto.unmodifiedRoll, heatHitsRoll: dto.heatHitsRoll, heatCriticalRoll: dto.heatCriticalRoll },
    );
    const result = await this.commandBus.execute<TreatInjuryCommand, TreatInjuryResult>(command);
    return MedicalResultDto.fromTreatment(result);
  }

  @ActorRoundAccess('act')
  @Patch(':id/injuries/:injuryId')
  @ApiOkResponse({ type: ActorRoundDto, description: 'Success' })
  @ApiOperation({ operationId: 'updateInjury', summary: 'Edit an injury (game master)' })
  @ApiErrors({ 404: 'Actor round or injury not found' })
  async updateInjury(
    @Param('id') id: string,
    @Param('injuryId') injuryId: string,
    @Body() dto: UpdateInjuryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const command = new UpdateInjuryCommand(id, injuryId, { ...dto }, user.id, user.roles);
    const entity = await this.commandBus.execute<UpdateInjuryCommand, ActorRound>(command);
    return ActorRoundDto.fromEntity(entity);
  }

  @ActorRoundAccess('act')
  @Delete(':id/injuries/:injuryId')
  @ApiOkResponse({ type: ActorRoundDto, description: 'Success' })
  @ApiOperation({ operationId: 'deleteInjury', summary: 'Remove an injury (game master)' })
  @ApiErrors({ 404: 'Actor round or injury not found' })
  async deleteInjury(@Param('id') id: string, @Param('injuryId') injuryId: string, @CurrentUser() user: AuthenticatedUser) {
    const command = new DeleteInjuryCommand(id, injuryId, user.id, user.roles);
    const entity = await this.commandBus.execute<DeleteInjuryCommand, ActorRound>(command);
    return ActorRoundDto.fromEntity(entity);
  }

  @ActorRoundAccess('act')
  @Post(':id/effects/:effectId/stabilize')
  @HttpCode(200)
  @ApiOkResponse({ type: MedicalResultDto, description: 'Success' })
  @ApiOperation({ operationId: 'stabilizeEffect', summary: 'Stabilize a dying actor with a Medicine roll (spec 013)' })
  @ApiErrors({ 404: 'Actor round or effect not found' })
  async stabilize(
    @Param('id') id: string,
    @Param('effectId') effectId: string,
    @Body() dto: MedicalRollDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const command = new StabilizeEffectCommand(
      id,
      effectId,
      { healerActorId: dto.healerActorId, healer: dto.healer },
      dto.roll,
      dto.difficulty,
      user.id,
      user.roles,
    );
    const result = await this.commandBus.execute<StabilizeEffectCommand, StabilizeEffectResult>(command);
    return MedicalResultDto.fromStabilize(result);
  }
}
