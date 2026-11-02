import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { MAX_NPC_COUNT } from '../../../application/services/game-npcs.service.js';
import type { EnvironmentFaction, GameNpc } from '../../../domain/value-objects/environment-faction.vo.js';

export class GameNpcDto {
  @ApiProperty({ description: 'NPC of rmu-api-npcs', example: 'npc-wolf' })
  npcId: string;

  @ApiProperty({ description: 'Specimens', example: 3 })
  count: number;

  @ApiProperty({ description: 'Alias of the entry: its actors are named after it', example: 'Wolf' })
  name: string;

  static fromEntity(entity: GameNpc): GameNpcDto {
    return Object.assign(new GameNpcDto(), { npcId: entity.npcId, count: entity.count, name: entity.name });
  }
}

export class EnvironmentFactionDto {
  @ApiProperty({ description: 'Reserved faction id of the environment', example: 'environment' })
  factionId: string;

  @ApiProperty({ description: 'Name of the environment; `Environment` by default, which the front translates', example: 'Forest' })
  name: string;

  @ApiProperty({ description: 'The NPCs chosen for the environment', type: [GameNpcDto] })
  npcs: GameNpcDto[];

  static fromEntity(entity: EnvironmentFaction): EnvironmentFactionDto {
    const dto = new EnvironmentFactionDto();
    dto.factionId = entity.factionId;
    dto.name = entity.name;
    dto.npcs = entity.npcs.map(npc => GameNpcDto.fromEntity(npc));
    return dto;
  }
}

/** An environment NPC requested for the game: `count` specimens (1 by default), named after `name` or the NPC. */
export class EnvironmentNpcRequestDto {
  @ApiProperty({ description: 'NPC of rmu-api-npcs', example: 'npc-wolf' })
  @IsString()
  @IsNotEmpty()
  npcId: string;

  @ApiPropertyOptional({ description: `Specimens, 1-${MAX_NPC_COUNT}`, example: 3, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_NPC_COUNT)
  count?: number;

  @ApiPropertyOptional({ description: "Alias of the specimens, the NPC's name by default", example: 'Wolf' })
  @IsOptional()
  @IsString()
  name?: string;
}

/** An NPC requested for one faction of the game (`environment` for the environment). */
export class GameNpcRequestDto extends EnvironmentNpcRequestDto {
  @ApiProperty({ description: 'Faction of the game, or `environment`', example: 'faction-001' })
  @IsString()
  @IsNotEmpty()
  factionId: string;
}

export class CreateEnvironmentFactionDto {
  @ApiPropertyOptional({ description: 'Name of the environment, `Environment` by default', example: 'Forest' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: 'The NPCs of the environment', type: [EnvironmentNpcRequestDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EnvironmentNpcRequestDto)
  npcs: EnvironmentNpcRequestDto[];
}

export class UpdateEnvironmentFactionDto {
  @ApiProperty({ description: 'New name of the environment', example: 'Forest' })
  @IsString()
  @IsNotEmpty()
  name: string;
}
