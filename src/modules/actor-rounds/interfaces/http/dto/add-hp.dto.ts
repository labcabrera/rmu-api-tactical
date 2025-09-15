import { IsNumber } from 'class-validator';
import { AddEffectsCommand } from '../../../application/cqrs/commands/add-effects.command';

export class AddHpDto {
  @IsNumber()
  dmg: number;

  static toCommand(id: string, dto: AddHpDto, userId: string, userRoles: string[]): AddEffectsCommand {
    return new AddEffectsCommand(id, dto.dmg, [], userId, userRoles);
  }
}
