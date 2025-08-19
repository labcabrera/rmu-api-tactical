import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { AddItemCommand } from '../../../application/commands/add-item.comand';

export class AddItemDto {
  @ApiProperty({ description: 'Item name', example: 'Ork dagger' })
  @IsString()
  @IsOptional()
  name: string | undefined;

  @ApiProperty({ description: 'Item type identifier', example: 'dagger' })
  @IsString()
  @IsNotEmpty()
  itemTypeId: string;

  static toCommand(characterId: string, dto: AddItemDto, userId: string, roles: string[]): AddItemCommand {
    return new AddItemCommand(characterId, dto.name, dto.itemTypeId, userId, roles);
  }
}
