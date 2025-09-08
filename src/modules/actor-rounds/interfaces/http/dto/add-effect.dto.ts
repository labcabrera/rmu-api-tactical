import { IsNumber, IsOptional, IsString } from 'class-validator';
import { AddEffectCommand } from '../../../application/cqrs/commands/add-effect.command';
import { ActorRoundEffect } from '../../../domain/entities/actor-round-effect.vo';

export class AddEffectDto {
  @IsString()
  status: string;

  @IsOptional()
  @IsNumber()
  value: number | undefined;

  @IsOptional()
  @IsNumber()
  rounds: number | undefined;

  static toCommand(id: string, dto: AddEffectDto, userId: string, userRoles: string[]): AddEffectCommand {
    const effect = new ActorRoundEffect();
    effect.status = dto.status;
    effect.value = dto.value;
    effect.rounds = dto.rounds;
    return new AddEffectCommand(id, effect, userId, userRoles);
  }
}
