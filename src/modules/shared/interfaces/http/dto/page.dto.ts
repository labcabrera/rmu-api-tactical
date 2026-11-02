import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, Max, Min } from 'class-validator';

export class PaginationDto {
  @ApiProperty({ description: 'Current page number', example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  page: number = 0;

  @ApiProperty({ description: 'Number of items per page', example: 10 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  size: number = 20;

  @ApiProperty({ description: 'Total number of elements', example: 42 })
  totalElements: number;

  @ApiProperty({ description: 'Total number of pages', example: 5 })
  totalPages: number;
}
