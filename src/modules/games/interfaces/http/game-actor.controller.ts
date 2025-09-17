/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Body, Controller, Delete, HttpCode, Logger, Param, Post, Request, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/jwt.auth.guard';
import { ErrorDto } from '../../../shared/interfaces/http/dto';
import { AddGameActorsCommand } from '../../application/cqrs/commands/add-game-actors.command';
import { DeleteGameActorsCommand } from '../../application/cqrs/commands/delete-game-actors.command';
import { Game } from '../../domain/entities/game.aggregate';
import { AddGameActorsDto } from './dto/add-game-actors.dto';
import { DeleteGameActorsDto } from './dto/delete-game-actors.dto';
import { GameDto } from './dto/game.dto';

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
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  async addActors(@Param('id') id: string, @Body() dto: AddGameActorsDto, @Request() req) {
    const user = req.user!;
    const command = AddGameActorsDto.toCommand(id, dto, user.id as string, user.roles as string[]);
    const entity = await this.commandBus.execute<AddGameActorsCommand, Game>(command);
    return GameDto.fromEntity(entity);
  }

  @Delete(':id/actors')
  @HttpCode(200)
  @ApiOperation({ operationId: 'deleteGameActors', summary: 'Delete game actors' })
  @ApiOkResponse({ type: DeleteGameActorsDto, description: 'Success' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  async deleteActors(@Param('id') id: string, @Body() dto: DeleteGameActorsDto, @Request() req) {
    const user = req.user!;
    const command = DeleteGameActorsDto.toCommand(id, dto, user.id as string, user.roles as string[]);
    const entity = await this.commandBus.execute<DeleteGameActorsCommand, Game>(command);
    return GameDto.fromEntity(entity);
  }
}
