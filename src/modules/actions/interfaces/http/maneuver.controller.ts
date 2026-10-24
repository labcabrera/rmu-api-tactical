import { Body, Controller, Get, Logger, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBody, ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../shared/infrastructure/security/jwt-auth.guard';
import { ResolveManeuverCommand } from '../../application/cqrs/commands/resolve-maneuver.command';
import { GetManeuverModifiersQuery } from '../../application/cqrs/queries/get-maneuver-modifiers.query';
import type { ManeuverModifiersListing } from '../../application/services/maneuver/maneuver-context.service';
import { Action } from '../../domain/aggregates/action';
import { ActionDto } from './dto/action.dto';
import { ManeuverModifiersDto } from './dto/maneuver-modifiers.dto';
import { ResolveManeuverDto } from './dto/resolve-maneuver.dto';
import { ApiErrors } from '../../../shared/interfaces/http/api-errors.decorator';
import { CurrentUser } from '../../../shared/interfaces/http/current-user.decorator';
import type { AuthenticatedUser } from '../../../shared/interfaces/http/authenticated-request';

@UseGuards(JwtAuthGuard)
@Controller('v1/actions')
@ApiTags('Actions')
export class ManeuverController {
  private readonly logger = new Logger(ManeuverController.name);

  constructor(
    private commandBus: CommandBus,
    private queryBus: QueryBus,
  ) {}

  @Get(':id/maneuver/modifiers')
  @ApiOperation({ operationId: 'getManeuverModifiers', summary: 'Modifiers a declared maneuver can take' })
  @ApiQuery({ name: 'skillId', required: false, description: 'Skill to roll with instead of the declared one' })
  @ApiQuery({ name: 'specialization', required: false, description: 'Specialization of the skill' })
  @ApiOkResponse({ type: ManeuverModifiersDto, description: 'Success' })
  @ApiErrors({ 400: 'Bad request, invalid data', 404: 'Action not found' })
  async getManeuverModifiers(
    @Param('id') id: string,
    @Query('skillId') skillId: string | undefined,
    @Query('specialization') specialization: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const query = new GetManeuverModifiersQuery(id, skillId || undefined, specialization || undefined, user.id, user.roles);
    const listing = await this.queryBus.execute<GetManeuverModifiersQuery, ManeuverModifiersListing>(query);
    return ManeuverModifiersDto.fromListing(listing);
  }

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
