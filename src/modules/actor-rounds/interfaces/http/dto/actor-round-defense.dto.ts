import { ApiProperty } from '@nestjs/swagger';
import { ActorRoundDefense } from '../../../domain/value-objets/actor-round-defense.vo';
import { ActorRoundShieldDto } from './actor-round-shield.dto';

export class ActorRoundDefenseDto {
  @ApiProperty({ description: 'Defensive bonus' })
  bd: number;

  @ApiProperty({ description: 'Armor type if all items have the same AT' })
  at: number | null;

  @ApiProperty({ description: 'Armor type of the head' })
  headAt: number | null;

  @ApiProperty({ description: 'Armor type of the body' })
  bodyAt: number | null;

  @ApiProperty({ description: 'Armor type of the arms' })
  armsAt: number | null;

  @ApiProperty({ description: 'Armor type of the legs' })
  legsAt: number | null;

  @ApiProperty({ description: 'Shield info', required: false })
  shield: ActorRoundShieldDto | null;

  static fromEntity(entity: ActorRoundDefense): ActorRoundDefenseDto {
    const dto = new ActorRoundDefenseDto();
    dto.bd = entity.bd;
    dto.at = entity.at;
    dto.headAt = entity.headAt;
    dto.bodyAt = entity.bodyAt;
    dto.armsAt = entity.armsAt;
    dto.legsAt = entity.legsAt;
    dto.shield = entity.shield ? ActorRoundShieldDto.fromEntity(entity.shield) : null;
    return dto;
  }
}
