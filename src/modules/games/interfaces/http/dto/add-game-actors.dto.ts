import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsOptional, ValidateNested } from 'class-validator';
import { AddGameActorsCommand } from '../../../application/cqrs/commands/add-game-actors.command.js';
import { CreateGameActorDto } from './create-game.dto.js';
import { GameNpcRequestDto } from './environment-faction.dto.js';

export class AddGameActorsDto {
  @ApiPropertyOptional({
    description: 'Characters to add',
    type: [CreateGameActorDto],
    example: [{ id: 'actor-001', type: 'character', faction: 'faction-001' }],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateGameActorDto)
  actors?: CreateGameActorDto[];

  @ApiPropertyOptional({
    description: 'NPCs to add, one actor per specimen; `factionId` may be `environment` (spec 055). Only in a created game',
    type: [GameNpcRequestDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GameNpcRequestDto)
  npcs?: GameNpcRequestDto[];

  static toCommand(gameId: string, dto: AddGameActorsDto, userId: string, roles: string[]) {
    return new AddGameActorsCommand(
      gameId,
      (dto.actors || []).map(e => CreateGameActorDto.toCommand(e)),
      userId,
      roles,
      (dto.npcs || []).map(npc => ({ npcId: npc.npcId, factionId: npc.factionId, count: npc.count, name: npc.name })),
    );
  }
}
