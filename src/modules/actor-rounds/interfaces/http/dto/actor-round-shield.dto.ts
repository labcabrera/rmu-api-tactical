import { ApiProperty } from '@nestjs/swagger';
import { ActorRoundShield } from '../../../domain/value-objets/actor-round-shield.vo';

export class ActorRoundShieldDto {
  @ApiProperty({ description: 'Shield defensive bonus', example: 20 })
  db: number;

  @ApiProperty({ description: 'Max shield blocks', example: 2 })
  blockCount: number;

  @ApiProperty({ description: 'Current remaining blocks' })
  currentBlocks: number;

  static fromEntity(entity: ActorRoundShield): ActorRoundShieldDto {
    const dto = new ActorRoundShieldDto();
    dto.db = entity.db;
    dto.blockCount = entity.blockCount;
    dto.currentBlocks = entity.currentBlocks;
    return dto;
  }
}
