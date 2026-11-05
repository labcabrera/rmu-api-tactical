import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsInt, IsOptional, Min, ValidateNested } from 'class-validator';
import { PrepareAttackCommand } from '../../../application/cqrs/commands/prepare-attack.command.js';
import { PrepareAttackItemDto } from './prepare-attack-item.dto.js';

export class PrepareAttackDto {
  @ApiProperty({ description: 'List of attacks to prepare', type: [PrepareAttackItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PrepareAttackItemDto)
  attacks: PrepareAttackItemDto[];

  @ApiProperty({
    description:
      'Spec 077 (P9): a bolt with Scope Skills strikes up to 1 + tier targets and splits its OB among them: the OB of each ' +
      'attack, in order (whole numbers from 0, summing up to the OB of the bolt). In equal parts when left out',
    required: false,
    type: [Number],
    example: [30, 20],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsInt({ each: true })
  @Min(0, { each: true })
  obSplit?: number[];

  static toCommand(actionId: string, dto: PrepareAttackDto, userId: string, roles: string[]): PrepareAttackCommand {
    return new PrepareAttackCommand(
      actionId,
      dto.attacks.map(attack => PrepareAttackItemDto.toCommand(attack)),
      userId,
      roles,
      dto.obSplit,
    );
  }
}
