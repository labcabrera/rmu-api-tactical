import { AddHpCommand } from '../../../application/commands/add-hp.command';

export class AddHpDto {
  hp: number;

  static toCommand(id: string, dto: AddHpDto, userId: string, userRoles: string[]): AddHpCommand {
    return new AddHpCommand(id, dto.hp, userId, userRoles);
  }
}
