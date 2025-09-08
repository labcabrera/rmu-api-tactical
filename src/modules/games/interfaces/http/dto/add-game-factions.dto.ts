import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { AddGameFactionsCommand } from '../../../application/cqrs/commands/add-game-factions.command';

export class AddGameFactionsDto {
  @ApiProperty({ description: 'Factions identifiers', example: ['faction-001', 'faction-002'] })
  @IsString({ each: true })
  @IsNotEmpty()
  factions: string[];

  static toCommand(gameId: string, dto: AddGameFactionsDto, userId: string, roles: string[]) {
    return new AddGameFactionsCommand(gameId, dto.factions, userId, roles);
  }
}
