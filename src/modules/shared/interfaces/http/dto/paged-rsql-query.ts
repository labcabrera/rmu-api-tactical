import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, type TransformFnParams } from 'class-transformer';
import { IsOptional, IsInt, Max, Min, IsString } from 'class-validator';

/** Largest page of a listing (spec 018). */
export const MAX_PAGE_SIZE = 100;
/** Largest page of the listings the clients load whole: the actions of a round. */
export const MAX_CATALOG_PAGE_SIZE = 1000;

// Empty query values fall back to the default; anything else is left for @IsInt to reject.
const toInt =
  (fallback: number) =>
  ({ value }: TransformFnParams): unknown => {
    if (value === undefined || value === null || value === '') return fallback;
    return typeof value === 'string' ? Number(value) : (value as unknown);
  };

/** The search and page fields; each listing adds its size and maximum. */
abstract class SearchPageDto {
  @ApiPropertyOptional({ description: 'RSQL search expression', example: 'name=re=lord', type: String, required: false })
  @IsString()
  @IsOptional()
  q: string | undefined;

  @ApiProperty({ description: 'Page', minimum: 0, example: 0, default: 0 })
  @IsInt()
  @IsOptional()
  @Min(0)
  @Transform(toInt(0))
  page: number = 0;
}

export class PagedQueryDto extends SearchPageDto {
  @ApiProperty({ description: 'Size', minimum: 1, maximum: MAX_PAGE_SIZE, example: 10, default: 10 })
  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  @Transform(toInt(10))
  size: number = 10;
}

export class CatalogPagedQueryDto extends SearchPageDto {
  @ApiProperty({ description: 'Size', minimum: 1, maximum: MAX_CATALOG_PAGE_SIZE, example: 10, default: 10 })
  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(MAX_CATALOG_PAGE_SIZE)
  @Transform(toInt(10))
  size: number = 10;
}
