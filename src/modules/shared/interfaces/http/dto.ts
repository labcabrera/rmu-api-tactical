/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class ErrorDto {
  @ApiProperty({ description: 'Error code', example: 'SomeError' })
  error: string;

  @ApiProperty({ description: 'Error message', example: 'Some error description' })
  message: string;

  @ApiProperty({ description: 'Timestamp', example: '2023-01-01T00:00:00Z' })
  timestamp: Date;
}

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

export class PaginationDto {
  @ApiProperty({
    description: 'Current page number',
    example: 0,
  })
  page: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 10,
  })
  size: number;

  @ApiProperty({
    description: 'Total number of elements',
    example: 42,
  })
  totalElements: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 5,
  })
  totalPages: number;
}
