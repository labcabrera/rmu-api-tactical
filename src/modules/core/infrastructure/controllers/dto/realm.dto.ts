import { ApiProperty } from '@nestjs/swagger';

import { Realm } from 'src/modules/core/domain/entities/realm';

export class RealmDto {
  @ApiProperty({ description: 'Unique identifier for the realm', example: 'lotr' })
  id: string;

  @ApiProperty({ description: 'Name of the realm', example: 'Lord of the Rings' })
  name: string;

  @ApiProperty({ description: 'Description of the realm', required: false, example: 'A fantasy world created by J.R.R. Tolkien' })
  description?: string;

  static fromEntity(entity: Realm): RealmDto {
    const dto = new RealmDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.description = entity.description;
    return dto;
  }
}
