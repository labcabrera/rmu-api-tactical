import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';
import { AddFatigueCommand } from '../../../application/cqrs/commands/add-fatigue.command';

export class AddFatigueAccumulatorDto {
  @ApiProperty({ description: 'Fatigue accumulator to add or subtract' })
  @IsNumber()
  fatigueAccumulator: number;

  static toCommand(id: string, dto: AddFatigueAccumulatorDto, userId: string, userRoles: string[]): AddFatigueCommand {
    return new AddFatigueCommand(id, undefined, undefined, dto.fatigueAccumulator, userId, userRoles);
  }
}
