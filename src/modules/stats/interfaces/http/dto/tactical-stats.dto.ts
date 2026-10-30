import { ApiProperty } from '@nestjs/swagger';
import { CollectionStatsDto } from './collection-stats.dto.js';

export class TacticalStatsDto {
  @ApiProperty({ description: 'Tactical games by status', type: CollectionStatsDto })
  games: CollectionStatsDto;
}
