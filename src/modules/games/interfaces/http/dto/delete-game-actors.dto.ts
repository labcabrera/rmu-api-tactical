import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { DeleteGameActorsCommand } from '../../../application/cqrs/commands/delete-game-actors.command';

export class DeleteGameActorsDto {
  @ApiProperty({ description: 'Actors identifiers', example: ['actor-001', 'actor-002'] })
  @IsString({ each: true })
  @IsNotEmpty()
  actors: string[];

  static toCommand(gameId: string, dto: DeleteGameActorsDto, userId: string, roles: string[]): DeleteGameActorsCommand {
    return new DeleteGameActorsCommand(gameId, dto.actors, userId, roles);
  }
}
