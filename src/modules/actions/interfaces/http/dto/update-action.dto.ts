import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { UpdateActionCommand } from '../../../application/cqrs/commands/update-action.command.js';

export class UpdateActionDto {
  @ApiProperty({ type: String, description: 'Action description', example: 'Attack the enemy', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description: string | undefined;

  @ApiPropertyOptional({ description: 'Version the client read (from the GET); a different stored version is a 409', example: 3 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  version?: number;

  static toCommand(id: string, dto: UpdateActionDto, userId: string, roles: string[]): UpdateActionCommand {
    return new UpdateActionCommand(id, dto.description, userId, roles, dto.version);
  }
}
