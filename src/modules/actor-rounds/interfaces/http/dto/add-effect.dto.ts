import { IsNumber, IsOptional, IsString } from 'class-validator';
import { randomUUID } from 'crypto';
import { AddEffectsCommand } from '../../../application/cqrs/commands/add-effects.command';
import { ActorRoundEffect } from '../../../domain/value-objets/actor-round-effect.vo';

export class AddEffectDto {
  @IsString()
  status: string;

  @IsOptional()
  @IsNumber()
  value: number | undefined;

  @IsOptional()
  @IsNumber()
  rounds: number | undefined;

  static toCommand(id: string, dto: AddEffectDto, userId: string, userRoles: string[]): AddEffectsCommand {
    const effects = [new ActorRoundEffect(randomUUID(), dto.status, dto.value, dto.rounds)];
    return new AddEffectsCommand(id, 0, effects, userId, userRoles);
  }
}
