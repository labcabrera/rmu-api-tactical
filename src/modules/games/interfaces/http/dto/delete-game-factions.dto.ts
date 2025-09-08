import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { DeleteGameFactionsCommand } from '../../../application/cqrs/commands/delete-game-factions.command';

export class DeleteGameFactionsDto {
  @ApiProperty({ description: 'Factions identifiers', example: ['faction-001', 'faction-002'] })
  @IsString({ each: true })
  @IsNotEmpty()
  factions: string[];

  static toCommand(gameId: string, dto: DeleteGameFactionsDto, userId: string, roles: string[]): DeleteGameFactionsCommand {
    return new DeleteGameFactionsCommand(gameId, dto.factions, userId, roles);
  }
}
