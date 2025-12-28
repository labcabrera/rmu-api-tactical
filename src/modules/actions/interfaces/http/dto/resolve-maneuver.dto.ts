import { ApiProperty } from '@nestjs/swagger';
import { IsObject } from 'class-validator';
import { ResolveManeuverCommand } from '../../../application/cqrs/commands/resolve-maneuver.commands';
import { SimpleRoll } from '../../../application/cqrs/commands/simple-roll';
import { ResolveManeuverModifiersDto } from './resolve-maneuver-modifiers.dto';
import { SimpleRollDto } from './simple-roll-dto';

export class ResolveManeuverDto {
  @ApiProperty({ description: 'Maneuver modifiers' })
  @IsObject()
  modifiers: ResolveManeuverModifiersDto;

  @ApiProperty({ description: 'Simple roll' })
  @IsObject()
  roll: SimpleRollDto;

  static toCommand(actionId: string, dto: ResolveManeuverDto, userId: string, roles: string[]): ResolveManeuverCommand {
    return new ResolveManeuverCommand(
      actionId,
      ResolveManeuverModifiersDto.toCommand(dto.modifiers),
      new SimpleRoll(dto.roll.roll),
      userId,
      roles,
    );
  }
}
