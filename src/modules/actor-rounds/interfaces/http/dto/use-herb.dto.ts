import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import type { UseHerbResult } from '../../../application/cqrs/handlers/use-herb.handler.js';
import { ActorRoundDto } from './actor-round.dto.js';

/** `POST /v1/actor-rounds/:id/herbs` (workspace spec 062). */
export class UseHerbDto {
  @ApiProperty({ description: 'Strategic item of the character of the actor: a herb with heal or stun relief' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  itemId: string;

  @ApiPropertyOptional({ description: 'Hits healed by the dose; rolled in the range of the herb when missing', example: 6 })
  @IsInt()
  @Min(0)
  @IsOptional()
  roll?: number;
}

export class HerbItemDto {
  @ApiProperty()
  id: string;
  @ApiProperty()
  itemTypeId: string;
  @ApiProperty()
  name: string;
}

export class UseHerbResultDto {
  @ApiProperty({ type: ActorRoundDto })
  actorRound: ActorRoundDto;

  @ApiProperty({ type: HerbItemDto, description: 'The herb used: tactical spends no dose, strategic keeps them' })
  item: HerbItemDto;

  @ApiPropertyOptional({ description: 'Hits of the dose, sent or rolled (only a herb that heals)' })
  roll?: number;

  @ApiProperty({ description: 'Hits healed, up to the maximum' })
  healed: number;

  @ApiProperty({ description: 'Rounds of stun removed' })
  stunRoundsRemoved: number;

  static from(result: UseHerbResult): UseHerbResultDto {
    const dto = new UseHerbResultDto();
    dto.actorRound = ActorRoundDto.fromEntity(result.actorRound);
    dto.item = { ...result.item };
    if (result.roll !== undefined) dto.roll = result.roll;
    dto.healed = result.healed;
    dto.stunRoundsRemoved = result.stunRoundsRemoved;
    return dto;
  }
}
