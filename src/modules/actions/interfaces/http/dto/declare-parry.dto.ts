import { IsArray, IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { DeclareParryCommand, DeclareParryItem } from '../../../application/cqrs/commands/declare-parry.command';

export class DeclareParryItemDto {
  @IsString()
  @IsNotEmpty()
  parryId: string;

  @IsNumber()
  parry: number;

  static toCommandItem(dto: DeclareParryItemDto): DeclareParryItem {
    return new DeclareParryItem(dto.parryId, dto.parry);
  }
}

export class DeclareParryDto {
  @IsArray()
  @IsNotEmpty()
  public parries: DeclareParryItemDto[];

  static toCommand(actionId: string, dto: DeclareParryDto, userId: string, roles: string[]) {
    return new DeclareParryCommand(
      actionId,
      dto.parries.map((e) => DeclareParryItemDto.toCommandItem(e)),
      userId,
      roles,
    );
  }
}
