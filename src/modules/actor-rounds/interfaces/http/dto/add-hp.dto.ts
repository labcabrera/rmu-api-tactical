import { IsNumber } from 'class-validator';
import { AddHpCommand } from '../../../application/cqrs/commands/add-hp.command';

export class AddHpDto {
  @IsNumber()
  hp: number;

  static toCommand(id: string, dto: AddHpDto, userId: string, userRoles: string[]): AddHpCommand {
    return new AddHpCommand(id, dto.hp, userId, userRoles);
  }
}
