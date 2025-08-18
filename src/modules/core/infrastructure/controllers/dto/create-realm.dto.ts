import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

import { CreateRealmCommand } from 'src/modules/core/application/commands/create-realm.command';

export class CreateRealmDto {
  @ApiProperty({ description: 'Unique identifier for the realm', example: 'lotr' })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({ description: 'Name of the realm', example: 'Lord of the Rings' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Description of the realm', required: false, example: 'A fantasy world created by J.R.R. Tolkien' })
  @IsString()
  @IsOptional()
  description: string | undefined;

  static toCommand(dto: CreateRealmDto, userId: string, userRoles: string[]) {
    return new CreateRealmCommand(dto.id, dto.name, dto.description, userId, userRoles);
  }
}
