/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Body, Controller, Delete, HttpCode, Logger, Param, Post, Request, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/jwt.auth.guard';
import { ErrorDto } from '../../../shared/interfaces/http/dto';
import { Game } from '../../domain/entities/game.aggregate';
import { AddGameFactionsDto } from './dto/add-game-factions.dto';
import { DeleteGameFactionsDto } from './dto/delete-game-factions.dto';
import { GameDto } from './dto/game.dto';

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
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  async addFactions(@Param('id') id: string, @Body() dto: AddGameFactionsDto, @Request() req) {
    const user = req.user!;
    const command = AddGameFactionsDto.toCommand(id, dto, user.id as string, user.roles as string[]);
    const entity = await this.commandBus.execute<AddGameFactionsDto, Game>(command);
    return GameDto.fromEntity(entity);
  }

  @Delete(':id/factions')
  @HttpCode(200)
  @ApiOperation({ operationId: 'deleteGameFactions', summary: 'Delete game factions' })
  @ApiOkResponse({ type: DeleteGameFactionsDto, description: 'Success' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  async deleteFactions(@Param('id') id: string, @Body() dto: DeleteGameFactionsDto, @Request() req) {
    const user = req.user!;
    const command = DeleteGameFactionsDto.toCommand(id, dto, user.id as string, user.roles as string[]);
    const entity = await this.commandBus.execute<DeleteGameFactionsDto, Game>(command);
    return GameDto.fromEntity(entity);
  }
}
