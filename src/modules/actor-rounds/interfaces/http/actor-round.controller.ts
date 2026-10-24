/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Body, Controller, Delete, Get, HttpCode, Logger, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/jwt.auth.guard';
import { Page } from '../../../shared/domain/entities/page.entity';
import { ErrorDto, PagedQueryDto } from '../../../shared/interfaces/http/dto';
import { AddEffectsCommand } from '../../application/cqrs/commands/add-effects.command';
import { AddFatigueCommand } from '../../application/cqrs/commands/add-fatigue.command';
import { AdjustHpCommand } from '../../application/cqrs/commands/adjust-hp.command';
import { DeleteInjuryCommand } from '../../application/cqrs/commands/delete-injury.command';
import { StabilizeEffectCommand } from '../../application/cqrs/commands/stabilize-effect.command';
import { TreatInjuryCommand } from '../../application/cqrs/commands/treat-injury.command';
import { UpdateInjuryCommand } from '../../application/cqrs/commands/update-injury.command';
import type { StabilizeEffectResult } from '../../application/cqrs/handlers/stabilize-effect.handler';
import type { TreatInjuryResult } from '../../application/cqrs/handlers/treat-injury.handler';
import { DeclareDefenseModeCommand } from '../../application/cqrs/commands/declare-defense-mode.command';
import { DeclareInitiativeCommand } from '../../application/cqrs/commands/declare-initiative.command';
import { DeleteEffectCommand } from '../../application/cqrs/commands/delete-effect.command';
import { ResolveEnduranceCheckCommand } from '../../application/cqrs/commands/resolve-endurance-check.command';
import { GetActorRoundQuery } from '../../application/cqrs/queries/get-actor-round.query';
import { GetActorsRoundsQuery } from '../../application/cqrs/queries/get-actor-rounds.query';
import { ActorRound } from '../../domain/aggregates/actor-round.aggregate';
import { DeclareDefenseModeDto } from './dto/actor-round-defense-mode.dto';
import { ActorRoundDto, CharacterRoundPageDto } from './dto/actor-round.dto';
import { AddEffectDto } from './dto/add-effect.dto';
import { AddFatigueAccumulatorDto } from './dto/add-fatigue-accumulator.dto';
import { AddHpDto } from './dto/add-hp.dto';
import { DeclareInitiativeDto } from './dto/declare-initiative.dto';
import { ResolveEnduranceCheckDto } from './dto/resolve-endurance-check.dto';
import { ResolveBreakageCheckDto } from './dto/resolve-breakage-check.dto';
import { ResolveBreakageCheckCommand } from '../../application/cqrs/commands/resolve-breakage-check.command';
import { MedicalResultDto, MedicalRollDto, TreatInjuryDto, UpdateInjuryDto } from './dto/treat-injury.dto';

@UseGuards(JwtAuthGuard)
@Controller('v1/actor-rounds')
@ApiTags('Actor Rounds')
export class ActorRoundController {
  private readonly logger = new Logger(ActorRoundController.name);

  constructor(
    private commandBus: CommandBus,
    private queryBus: QueryBus,
  ) {}

  @Get(':id')
  @ApiOkResponse({ type: ActorRoundDto, description: 'Success' })
  @ApiOperation({ operationId: 'findActorRoundById', summary: 'Find actor round by id' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  @ApiNotFoundResponse({ description: 'Actor round not found', type: ErrorDto })
  async findById(@Param('id') id: string, @Request() req) {
    const user = req.user!;
    const query = new GetActorRoundQuery(id, user.id as string, user.roles as string[]);
    const entity = await this.queryBus.execute<GetActorRoundQuery, ActorRound>(query);
    this.logger.debug(`Actor round found: ${JSON.stringify(entity)}`);
    return ActorRoundDto.fromEntity(entity);
  }

  @Get('')
  @ApiOkResponse({ type: CharacterRoundPageDto, description: 'Success' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  @ApiOperation({ operationId: 'findActorRounds', summary: 'Find actor rounds by RSQL' })
  async find(@Query() dto: PagedQueryDto, @Request() req) {
    this.logger.debug(`Finding actor rounds with query: ${JSON.stringify(dto)}`);
    const user = req.user!;
    const query = new GetActorsRoundsQuery(dto.q, dto.page, dto.size, user.id as string, user.roles as string[]);
    const page = await this.queryBus.execute<GetActorsRoundsQuery, Page<ActorRound>>(query);
    const mapped = page.content.map(actorRound => ActorRoundDto.fromEntity(actorRound));
    return new Page<ActorRoundDto>(mapped, page.pagination.page, page.pagination.size, page.pagination.totalElements);
  }

  @Patch(':id/initiative')
  @ApiOkResponse({ type: ActorRoundDto, description: 'Success' })
  @ApiOperation({ operationId: 'declareInitiative', summary: 'Declare initiative' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  @ApiNotFoundResponse({ description: 'Actor round not found', type: ErrorDto })
  async declareInitiative(@Param('id') id: string, @Body() dto: DeclareInitiativeDto, @Request() req) {
    const user = req.user!;
    const command = DeclareInitiativeDto.toCommand(id, dto, user.id as string, user.roles as string[]);
    const entity = await this.commandBus.execute<DeclareInitiativeCommand, ActorRound>(command);
    return ActorRoundDto.fromEntity(entity);
  }

  @Patch(':id/defense-mode')
  @ApiOkResponse({ type: ActorRoundDto, description: 'Success' })
  @ApiOperation({ operationId: 'declareDefenseMode', summary: 'Declare the dodge and shield block of the round' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  @ApiNotFoundResponse({ description: 'Actor round not found', type: ErrorDto })
  async declareDefenseMode(@Param('id') id: string, @Body() dto: DeclareDefenseModeDto, @Request() req) {
    const user = req.user!;
    const command = DeclareDefenseModeDto.toCommand(id, dto, user.id as string, user.roles as string[]);
    const entity = await this.commandBus.execute<DeclareDefenseModeCommand, ActorRound>(command);
    return ActorRoundDto.fromEntity(entity);
  }

  @Patch(':id/hp')
  @ApiOkResponse({ type: ActorRoundDto, description: 'Success' })
  @ApiOperation({ operationId: 'addHp', summary: 'Take (dmg > 0) or heal (dmg < 0) hits, up to the maximum' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  @ApiNotFoundResponse({ description: 'Actor round not found', type: ErrorDto })
  async addHp(@Param('id') id: string, @Body() dto: AddHpDto, @Request() req) {
    const user = req.user!;
    const command = new AdjustHpCommand(id, dto.dmg, user.id as string, user.roles as string[]);
    const entity = await this.commandBus.execute<AdjustHpCommand, ActorRound>(command);
    return ActorRoundDto.fromEntity(entity);
  }

  @Patch(':id/fatigue-accumulator')
  @ApiOkResponse({ type: ActorRoundDto, description: 'Success' })
  @ApiOperation({ operationId: 'addFatigueAccumulator', summary: 'Add or subtract fatigue accumulator' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  @ApiNotFoundResponse({ description: 'Actor round not found', type: ErrorDto })
  async addFatigueAccumulator(@Param('id') id: string, @Body() dto: AddFatigueAccumulatorDto, @Request() req) {
    const user = req.user!;
    const command = AddFatigueAccumulatorDto.toCommand(id, dto, user.id as string, user.roles as string[]);
    const entity = await this.commandBus.execute<AddFatigueCommand, ActorRound>(command);
    return ActorRoundDto.fromEntity(entity);
  }

  @Patch(':id/endurance-check')
  @ApiOkResponse({ type: ActorRoundDto, description: 'Success' })
  @ApiOperation({ operationId: 'resolveEnduranceCheck', summary: 'Resolve an endurance roll and apply its fatigue and hits' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  @ApiNotFoundResponse({ description: 'Actor round not found', type: ErrorDto })
  async resolveEnduranceCheck(@Param('id') id: string, @Body() dto: ResolveEnduranceCheckDto, @Request() req) {
    const user = req.user!;
    const command = ResolveEnduranceCheckDto.toCommand(id, dto, user.id as string, user.roles as string[]);
    const entity = await this.commandBus.execute<ResolveEnduranceCheckCommand, ActorRound>(command);
    return ActorRoundDto.fromEntity(entity);
  }

  @Post(':id/breakage-checks')
  @HttpCode(200)
  @ApiOkResponse({ type: ActorRoundDto, description: 'Success, with the result in lastBreakageCheck' })
  @ApiOperation({ operationId: 'resolveBreakageCheck', summary: 'Resolve a breakage check of an item of the actor (spec 019)' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  @ApiNotFoundResponse({ description: 'Actor round, item or alert not found', type: ErrorDto })
  async resolveBreakageCheck(@Param('id') id: string, @Body() dto: ResolveBreakageCheckDto, @Request() req) {
    const user = req.user!;
    const command = ResolveBreakageCheckDto.toCommand(id, dto, user.id as string, user.roles as string[]);
    const entity = await this.commandBus.execute<ResolveBreakageCheckCommand, ActorRound>(command);
    return ActorRoundDto.fromEntity(entity);
  }

  @Post(':id/effects')
  @ApiOkResponse({ type: ActorRoundDto, description: 'Success' })
  @ApiOperation({ operationId: 'addEffect', summary: 'Add effect' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  @ApiNotFoundResponse({ description: 'Actor round not found', type: ErrorDto })
  async addEffect(@Param('id') id: string, @Body() dto: AddEffectDto, @Request() req) {
    const user = req.user!;
    const command = AddEffectDto.toCommand(id, dto, user.id as string, user.roles as string[]);
    const entity = await this.commandBus.execute<AddEffectsCommand, ActorRound>(command);
    return ActorRoundDto.fromEntity(entity);
  }

  @Delete(':id/effects/:effectId')
  @ApiOkResponse({ type: ActorRoundDto, description: 'Success' })
  @ApiOperation({ operationId: 'deleteEffect', summary: 'Delete effect' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  @ApiNotFoundResponse({ description: 'Actor round not found', type: ErrorDto })
  async deleteEffect(@Param('id') id: string, @Param('effectId') effectId: string, @Request() req) {
    const user = req.user!;
    const command = new DeleteEffectCommand(id, effectId, user.id as string, user.roles as string[]);
    const entity = await this.commandBus.execute<DeleteEffectCommand, ActorRound>(command);
    return ActorRoundDto.fromEntity(entity);
  }

  @Post(':id/injuries/:injuryId/treatments')
  @HttpCode(200)
  @ApiOkResponse({ type: MedicalResultDto, description: 'Success' })
  @ApiOperation({ operationId: 'treatInjury', summary: 'Treat an injury with a Medicine roll of a healer (spec 013)' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  @ApiNotFoundResponse({ description: 'Actor round or injury not found', type: ErrorDto })
  async treatInjury(@Param('id') id: string, @Param('injuryId') injuryId: string, @Body() dto: TreatInjuryDto, @Request() req) {
    const user = req.user!;
    const command = new TreatInjuryCommand(
      id,
      injuryId,
      dto.procedure,
      { healerActorId: dto.healerActorId, healer: dto.healer },
      dto.roll,
      dto.difficulty,
      user.id as string,
      user.roles as string[],
    );
    const result = await this.commandBus.execute<TreatInjuryCommand, TreatInjuryResult>(command);
    return MedicalResultDto.fromTreatment(result);
  }

  @Patch(':id/injuries/:injuryId')
  @ApiOkResponse({ type: ActorRoundDto, description: 'Success' })
  @ApiOperation({ operationId: 'updateInjury', summary: 'Edit an injury (game master)' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  @ApiNotFoundResponse({ description: 'Actor round or injury not found', type: ErrorDto })
  async updateInjury(@Param('id') id: string, @Param('injuryId') injuryId: string, @Body() dto: UpdateInjuryDto, @Request() req) {
    const user = req.user!;
    const command = new UpdateInjuryCommand(id, injuryId, { ...dto }, user.id as string, user.roles as string[]);
    const entity = await this.commandBus.execute<UpdateInjuryCommand, ActorRound>(command);
    return ActorRoundDto.fromEntity(entity);
  }

  @Delete(':id/injuries/:injuryId')
  @ApiOkResponse({ type: ActorRoundDto, description: 'Success' })
  @ApiOperation({ operationId: 'deleteInjury', summary: 'Remove an injury (game master)' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  @ApiNotFoundResponse({ description: 'Actor round or injury not found', type: ErrorDto })
  async deleteInjury(@Param('id') id: string, @Param('injuryId') injuryId: string, @Request() req) {
    const user = req.user!;
    const command = new DeleteInjuryCommand(id, injuryId, user.id as string, user.roles as string[]);
    const entity = await this.commandBus.execute<DeleteInjuryCommand, ActorRound>(command);
    return ActorRoundDto.fromEntity(entity);
  }

  @Post(':id/effects/:effectId/stabilize')
  @HttpCode(200)
  @ApiOkResponse({ type: MedicalResultDto, description: 'Success' })
  @ApiOperation({ operationId: 'stabilizeEffect', summary: 'Stabilize a dying actor with a Medicine roll (spec 013)' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  @ApiNotFoundResponse({ description: 'Actor round or effect not found', type: ErrorDto })
  async stabilize(@Param('id') id: string, @Param('effectId') effectId: string, @Body() dto: MedicalRollDto, @Request() req) {
    const user = req.user!;
    const command = new StabilizeEffectCommand(
      id,
      effectId,
      { healerActorId: dto.healerActorId, healer: dto.healer },
      dto.roll,
      dto.difficulty,
      user.id as string,
      user.roles as string[],
    );
    const result = await this.commandBus.execute<StabilizeEffectCommand, StabilizeEffectResult>(command);
    return MedicalResultDto.fromStabilize(result);
  }
}
