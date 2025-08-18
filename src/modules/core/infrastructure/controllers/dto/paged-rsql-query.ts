/* eslint-disable @typescript-eslint/no-unsafe-argument */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsInt, Min, IsString } from 'class-validator';

export class PagedQueryDto {
  @ApiPropertyOptional({ description: 'RSQL search expression', example: 'name=re=lord', type: String, required: false })
  @IsString()
  @IsOptional()
  q: string | undefined;

  @ApiProperty({ description: 'Page', minimum: 0, example: 0, default: 0 })
  @IsInt()
  @IsOptional()
  @Min(0)
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return 0;
    return parseInt(value, 10);
  })
  page: number = 0;

  @ApiProperty({ description: 'Size', minimum: 1, example: 10, default: 10 })
  @IsInt()
  @IsOptional()
  @Min(1)
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return 10;
    return parseInt(value, 10);
  })
  size: number = 10;
}
