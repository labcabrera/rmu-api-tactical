import { CreateActionCommand } from '../../../application/commands/create-action.command';

export class CreateActionDto {
  gameId: string;
  characterId: string;
  round: number;
  actionType: string;
  phaseStart: number;
  actionPoints: number;

  static toCommand(dto: CreateActionDto, userId: string, roles: string[]) {
    return new CreateActionCommand(dto.gameId, dto.round, dto.characterId, dto.actionType, dto.phaseStart, dto.actionPoints, userId, roles);
  }
}
