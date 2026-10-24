import { IsNumber, IsOptional, IsString } from 'class-validator';
import { randomUUID } from 'crypto';
import { AddEffectsCommand } from '../../../application/cqrs/commands/add-effects.command.js';
import { ActorRoundEffect } from '../../../domain/value-objects/actor-round-effect.vo.js';

export class AddEffectDto {
  constructor(status: string, value?: number, rounds?: number) {
    this.status = status;
    this.value = value;
    this.rounds = rounds;
  }

  @IsString()
  status: string;

  /**
   * For `surprised`, the action points lost: 2, or 1 after a successful Perception (2 when missing). For the AP effects
   * (spec 011): `staggered` AP lost in the phase (1 when missing), `haste`/`speed` extra AP (1-4), `reflexes` (1-3),
   * `adrenal-speed` (2 or 4), `hold` AP lost (3 when missing), `distraction` (1-3), `ap-cap` the most AP of the round,
   * `manual` AP added (positive) or taken (negative).
   */
  @IsOptional()
  @IsNumber()
  value: number | undefined;

  @IsOptional()
  @IsNumber()
  rounds: number | undefined;

  static toCommand(id: string, dto: AddEffectDto, userId: string, userRoles: string[]): AddEffectsCommand {
    const effects = [new ActorRoundEffect(randomUUID(), dto.status, dto.value, dto.rounds)];
    return new AddEffectsCommand(id, 0, effects, undefined, userId, userRoles);
  }
}
