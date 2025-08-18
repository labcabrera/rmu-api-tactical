import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

import { UpdateRealmCommand } from 'src/modules/core/application/commands/update-realm.command';

export class UpdateRealmDto {
  @ApiProperty({ description: 'Name of the realm', example: 'Lord of the Rings' })
  @IsString()
  @IsOptional()
  name: string | undefined;

  @ApiProperty({ description: 'Description of the realm', required: false, example: 'A fantasy world created by J.R.R. Tolkien' })
  @IsString()
  @IsOptional()
  description: string | undefined;

  static toCommand(id: string, dto: UpdateRealmDto, userId: string, userRoles: string[]) {
    return new UpdateRealmCommand(id, dto.name, dto.description, userId, userRoles);
  }
}
