import { Body, Controller, Delete, HttpCode, Logger, Param, Post, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../shared/infrastructure/security/jwt-auth.guard';
import { AddGameActorsCommand } from '../../application/cqrs/commands/add-game-actors.command';
import { DeleteGameActorsCommand } from '../../application/cqrs/commands/delete-game-actors.command';
import { Game } from '../../domain/aggregates/game';
import { AddGameActorsDto } from './dto/add-game-actors.dto';
import { DeleteGameActorsDto } from './dto/delete-game-actors.dto';
import { GameDto } from './dto/game.dto';
import { ApiErrors } from '../../../shared/interfaces/http/api-errors.decorator';
import { CurrentUser } from '../../../shared/interfaces/http/current-user.decorator';
import type { AuthenticatedUser } from '../../../shared/interfaces/http/authenticated-request';

@UseGuards(JwtAuthGuard)
@Controller('v1/tactical-games')
@ApiTags('Games')
export class GameActorController {
  private readonly logger = new Logger(GameActorController.name);

  constructor(private commandBus: CommandBus) {}

  @Post(':id/actors')
  @HttpCode(200)
  @ApiOperation({ operationId: 'addActors', summary: 'Add actors to game' })
  @ApiOkResponse({ type: AddGameActorsDto, description: 'Success' })
  @ApiErrors()
  async addActors(@Param('id') id: string, @Body() dto: AddGameActorsDto, @CurrentUser() user: AuthenticatedUser) {
    const command = AddGameActorsDto.toCommand(id, dto, user.id, user.roles);
    const entity = await this.commandBus.execute<AddGameActorsCommand, Game>(command);
    return GameDto.fromEntity(entity);
  }

  @Delete(':id/actors')
  @HttpCode(200)
  @ApiOperation({ operationId: 'deleteGameActors', summary: 'Delete game actors' })
  @ApiOkResponse({ type: DeleteGameActorsDto, description: 'Success' })
  @ApiErrors()
  async deleteActors(@Param('id') id: string, @Body() dto: DeleteGameActorsDto, @CurrentUser() user: AuthenticatedUser) {
    const command = DeleteGameActorsDto.toCommand(id, dto, user.id, user.roles);
    const entity = await this.commandBus.execute<DeleteGameActorsCommand, Game>(command);
    return GameDto.fromEntity(entity);
  }
}
