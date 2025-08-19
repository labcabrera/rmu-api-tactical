import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { CreateActionCommand } from '../../../application/commands/create-action.command';

export class CreateActionDto {
  @ApiProperty({ description: 'Game identifier' })
  @IsString()
  @IsNotEmpty()
  gameId: string;

  @ApiProperty({ description: 'Character identifier' })
  @IsString()
  @IsNotEmpty()
  characterId: string;

  @ApiProperty({ description: 'Action type' })
  @IsString()
  @IsNotEmpty()
  actionType: string;

  @ApiProperty({ description: 'Phase start' })
  @IsNumber()
  phaseStart: number;

  @ApiProperty({ description: 'Action points' })
  @IsNumber()
  actionPoints: number;

  static toCommand(dto: CreateActionDto, userId: string, roles: string[]) {
    return new CreateActionCommand(dto.gameId, dto.characterId, dto.actionType, dto.phaseStart, dto.actionPoints, userId, roles);
  }
}
