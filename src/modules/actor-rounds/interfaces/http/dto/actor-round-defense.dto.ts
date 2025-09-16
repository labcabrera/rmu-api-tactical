import { ApiProperty } from '@nestjs/swagger';
import { ActorRoundDefense } from '../../../domain/value-objets/actor-round-defense.vo';

export class ActorRoundDefenseDto {
  @ApiProperty({ description: 'Defensive bonus' })
  bd: number;

  @ApiProperty({ description: 'Armor type if all items have the same AT' })
  at: number | undefined;

  @ApiProperty({ description: 'Armor type of the head' })
  headAt: number | undefined;

  @ApiProperty({ description: 'Armor type of the body' })
  bodyAt: number | undefined;

  @ApiProperty({ description: 'Armor type of the arms' })
  armsAt: number | undefined;

  @ApiProperty({ description: 'Armor type of the legs' })
  legsAt: number | undefined;

  static fromEntity(entity: ActorRoundDefense): ActorRoundDefenseDto {
    const dto = new ActorRoundDefenseDto();
    dto.bd = entity.bd;
    dto.at = entity.at;
    dto.headAt = entity.headAt;
    dto.bodyAt = entity.bodyAt;
    dto.armsAt = entity.armsAt;
    dto.legsAt = entity.legsAt;
    return dto;
  }
}
