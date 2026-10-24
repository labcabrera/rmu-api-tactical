import { Body, Controller, Delete, HttpCode, Logger, Param, Post, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../shared/infrastructure/security/jwt-auth.guard';
import { Game } from '../../domain/aggregates/game';
import { AddGameFactionsDto } from './dto/add-game-factions.dto';
import { DeleteGameFactionsDto } from './dto/delete-game-factions.dto';
import { GameDto } from './dto/game.dto';
import { ApiErrors } from '../../../shared/interfaces/http/api-errors.decorator';
import { CurrentUser } from '../../../shared/interfaces/http/current-user.decorator';
import type { AuthenticatedUser } from '../../../shared/interfaces/http/authenticated-request';

@UseGuards(JwtAuthGuard)
@Controller('v1/tactical-games')
@ApiTags('Games')
export class GameFactionController {
  private readonly logger = new Logger(GameFactionController.name);

  constructor(private commandBus: CommandBus) {}

  @Post(':id/factions')
  @HttpCode(200)
  @ApiOperation({ operationId: 'addGameFactions', summary: 'Add factions to game' })
  @ApiOkResponse({ type: AddGameFactionsDto, description: 'Success' })
  @ApiErrors()
  async addFactions(@Param('id') id: string, @Body() dto: AddGameFactionsDto, @CurrentUser() user: AuthenticatedUser) {
    const command = AddGameFactionsDto.toCommand(id, dto, user.id, user.roles);
    const entity = await this.commandBus.execute<AddGameFactionsDto, Game>(command);
    return GameDto.fromEntity(entity);
  }

  @Delete(':id/factions')
  @HttpCode(200)
  @ApiOperation({ operationId: 'deleteGameFactions', summary: 'Delete game factions' })
  @ApiOkResponse({ type: DeleteGameFactionsDto, description: 'Success' })
  @ApiErrors()
  async deleteFactions(@Param('id') id: string, @Body() dto: DeleteGameFactionsDto, @CurrentUser() user: AuthenticatedUser) {
    const command = DeleteGameFactionsDto.toCommand(id, dto, user.id, user.roles);
    const entity = await this.commandBus.execute<DeleteGameFactionsDto, Game>(command);
    return GameDto.fromEntity(entity);
  }
}
