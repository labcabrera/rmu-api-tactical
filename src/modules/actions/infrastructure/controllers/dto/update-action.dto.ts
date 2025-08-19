import { UpdateActionCommand } from '../../../application/commands/update-action.command';

export class UpdateActionDto {
  actionPoints: number;
  static toCommand(id: string, dto: UpdateActionDto, userId: string, roles: string[]): UpdateActionCommand {
    return new UpdateActionCommand(dto.actionPoints, userId, roles);
  }
}
