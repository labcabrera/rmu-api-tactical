import { ApiProperty } from '@nestjs/swagger';
import { RealmDto } from './realm.dto';
import { RaceDto } from './race.dto';

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

export class RealmPageDto {
  @ApiProperty({
    type: [RealmDto],
    description: 'Realms',
    isArray: true,
  })
  content: RealmDto[];
  @ApiProperty({
    type: PaginationDto,
    description: 'Pagination information',
  })
  pagination: PaginationDto;
}

export class RacePageDto {
  @ApiProperty({
    type: [RaceDto],
    description: 'Races',
    isArray: true,
  })
  content: RaceDto[];
  @ApiProperty({
    type: PaginationDto,
    description: 'Pagination information',
  })
  pagination: PaginationDto;
}
