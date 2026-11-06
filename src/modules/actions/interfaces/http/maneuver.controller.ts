import { Body, Controller, Get, Logger, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBody, ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../shared/infrastructure/security/jwt-auth.guard.js';
import { ResolveManeuverCommand } from '../../application/cqrs/commands/resolve-maneuver.command.js';
import { GetManeuverModifiersQuery } from '../../application/cqrs/queries/get-maneuver-modifiers.query.js';
import type { ManeuverModifiersListing } from '../../application/services/maneuver/maneuver-context.service.js';
import { Action } from '../../domain/aggregates/action.js';
import { ActionDto } from './dto/action.dto.js';
import { ManeuverModifiersDto } from './dto/maneuver-modifiers.dto.js';
import { ResolveManeuverDto } from './dto/resolve-maneuver.dto.js';
import { ApiErrors } from '../../../shared/interfaces/http/api-errors.decorator.js';
import { CurrentUser } from '../../../shared/interfaces/http/current-user.decorator.js';
import type { AuthenticatedUser } from '../../../shared/interfaces/http/authenticated-request.js';
import { ActionAccess, ActionAccessGuard } from './security/action-access.guard.js';
import { ManeuverListingParams } from './dto/maneuver-listing-params.js';
import { MANEUVER_PURPOSES } from '../../domain/value-objects/maneuver-purpose.vo.js';
import { SKILL_RELATIONS } from '../../domain/services/skill-aids.js';

@UseGuards(JwtAuthGuard, ActionAccessGuard)
@Controller('v1/actions')
@ApiTags('Actions')
export class ManeuverController {
  private readonly logger = new Logger(ManeuverController.name);

  constructor(
    private commandBus: CommandBus,
    private queryBus: QueryBus,
  ) {}

  @ActionAccess('read')
  @Get(':id/maneuver/modifiers')
  @ApiOperation({ operationId: 'getManeuverModifiers', summary: 'Modifiers a declared maneuver can take' })
  @ApiQuery({ name: 'skillId', required: false, description: 'Skill to roll with instead of the declared one' })
  @ApiQuery({ name: 'specialization', required: false, description: 'Specialization of the skill' })
  @ApiQuery({
    name: 'purpose',
    required: false,
    enum: MANEUVER_PURPOSES,
    description: 'What the maneuver is for (spec 079: adrenal, fortitude, feat-of-strength)',
  })
  @ApiQuery({ name: 'similarTo', required: false, description: 'Spec 079: skill the maneuver needs; the one rolled is similar' })
  @ApiQuery({ name: 'similarSpecialization', required: false, description: 'Spec 079: specialization of the skill needed' })
  @ApiQuery({ name: 'similarity', required: false, description: 'Spec 079: 0, -25 or -50' })
  @ApiQuery({ name: 'relation', required: false, enum: SKILL_RELATIONS, description: 'Spec 079: relation the game master rules' })
  @ApiQuery({
    name: 'complementary',
    required: false,
    isArray: true,
    description: 'Spec 079: helpers as `actorId:skillId:specialization` (actorId empty: the actor itself), repeated',
  })
  @ApiQuery({ name: 'loadWeight', required: false, description: 'Spec 079, feat-of-strength: weight of the load in pounds' })
  @ApiQuery({ name: 'mechanicalFactor', required: false, description: 'Spec 079, feat-of-strength: 0.01-1' })
  @ApiQuery({ name: 'bodyWeight', required: false, description: 'Spec 079, feat-of-strength: body weight of an actor without a sheet' })
  @ApiQuery({ name: 'strengthBonus', required: false, description: 'Spec 079, feat-of-strength: St bonus of an actor without a sheet' })
  @ApiOkResponse({ type: ManeuverModifiersDto, description: 'Success' })
  @ApiErrors({ 400: 'Bad request, invalid data', 404: 'Action not found' })
  async getManeuverModifiers(
    @Param('id') id: string,
    @Query('skillId') skillId: string | undefined,
    @Query('specialization') specialization: string | undefined,
    @Query() raw: Record<string, string | string[] | undefined>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const query = new GetManeuverModifiersQuery(
      id,
      skillId || undefined,
      specialization || undefined,
      user.id,
      user.roles,
      ManeuverListingParams.parse(raw),
    );
    const listing = await this.queryBus.execute<GetManeuverModifiersQuery, ManeuverModifiersListing>(query);
    return ManeuverModifiersDto.fromListing(listing);
  }

  @ActionAccess('act')
  @Patch(':id/maneuver/resolve')
  @ApiBody({ type: ResolveManeuverDto })
  @ApiOperation({ operationId: 'resolveManeuver', summary: 'Resolve maneuver' })
  @ApiOkResponse({ type: ActionDto, description: 'Success' })
  @ApiErrors({ 400: 'Bad request, invalid data' })
  async resolveManeuver(@Param('id') id: string, @Body() dto: ResolveManeuverDto, @CurrentUser() user: AuthenticatedUser) {
    this.logger.debug(`Resolving maneuver: ${JSON.stringify(dto)} for user ${user.id}`);
    const command = ResolveManeuverDto.toCommand(id, dto, user.id, user.roles);
    const entity = await this.commandBus.execute<ResolveManeuverCommand, Action>(command);
    return ActionDto.fromEntity(entity);
  }
}
