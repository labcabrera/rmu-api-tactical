import { ApiProperty } from '@nestjs/swagger';
import { ActorRoundShield } from '../../../domain/value-objets/actor-round-shield.vo';

export class ActorRoundShieldDto {
  @ApiProperty({ description: 'Type of shield', example: 'none' })
  type: string;

  @ApiProperty({ description: 'Shield defensive bonus' })
  shieldDb: number;

  @ApiProperty({ description: 'Maximum number of blocks' })
  maxBlocks: number;

  @ApiProperty({ description: 'Current remaining blocks' })
  currentBlocks: number;

  static fromEntity(entity: ActorRoundShield): ActorRoundShieldDto {
    const dto = new ActorRoundShieldDto();
    dto.type = entity.type;
    dto.shieldDb = entity.shieldDb;
    dto.maxBlocks = entity.maxBlocks;
    dto.currentBlocks = entity.currentBlocks;
    return dto;
  }
}
