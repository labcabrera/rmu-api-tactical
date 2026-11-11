import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import type { FearEaseResult } from '../../../application/cqrs/handlers/fear-ease.handler.js';

/** `POST v1/tactical-games/:id/fear-ease` (workspace spec 100, decision 22). */
export class FearEaseDto {
  @ApiProperty({ description: 'Side whose standing members lose their balk and retreat', example: 'fellowship' })
  @IsString()
  @IsNotEmpty()
  sideId: string;
}

export class FearEaseResultDto {
  @ApiProperty({ type: [String], description: 'Actors whose balk or retreat was lifted' })
  actorIds: string[];

  static from(result: FearEaseResult): FearEaseResultDto {
    const dto = new FearEaseResultDto();
    dto.actorIds = [...result.actorIds];
    return dto;
  }
}
