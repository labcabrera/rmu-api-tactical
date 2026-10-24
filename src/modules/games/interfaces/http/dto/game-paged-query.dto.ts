import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { PagedQueryDto } from '../../../../shared/interfaces/http/dto/paged-rsql-query';
import { GAME_SORTS } from '../../../domain/value-objects/game-sort.vo';

export class GamePagedQueryDto extends PagedQueryDto {
  @ApiPropertyOptional({ description: 'Sort field, descending with a leading "-"', enum: GAME_SORTS, example: '-createdAt' })
  @IsIn(GAME_SORTS)
  @IsOptional()
  sort?: string;
}
