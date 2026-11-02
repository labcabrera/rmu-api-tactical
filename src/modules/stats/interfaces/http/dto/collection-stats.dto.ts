import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MonthCountDto {
  @ApiProperty({ description: 'Month, YYYY-MM in UTC', example: '2026-10' })
  month: string;

  @ApiProperty({ description: 'Documents created that month', example: 3 })
  count: number;
}

export class CollectionStatsDto {
  @ApiProperty({ description: 'Documents in the collection', example: 12 })
  total: number;

  @ApiPropertyOptional({ description: 'Documents by status', type: 'object', additionalProperties: { type: 'number' } })
  byStatus?: Record<string, number>;

  @ApiProperty({ description: 'Creations of the last 12 months, oldest first', type: [MonthCountDto] })
  createdByMonth: MonthCountDto[];
}
