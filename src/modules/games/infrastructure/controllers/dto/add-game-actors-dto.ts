import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';
import { AddGameActorsCommand } from '../../../application/commands/add-game-actors.command';
import { CreateGameActorDto } from './create-game.dto';

export class AddGameActorsDto {
  @ApiProperty({ description: 'Actors to add', example: [{ id: 'actor-001', type: 'character', faction: 'faction-001' }] })
  @IsNotEmpty()
  actors: CreateGameActorDto[];

  static toCommand(gameId: string, dto: AddGameActorsDto, userId: string, roles: string[]) {
    return new AddGameActorsCommand(gameId, dto.actors.map(CreateGameActorDto.toCommand), userId, roles);
  }
}
