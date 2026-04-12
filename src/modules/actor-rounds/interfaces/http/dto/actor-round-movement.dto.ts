import { ApiProperty } from '@nestjs/swagger';
import { ActorRoundMovement } from '../../../domain/value-objets/actor-round-movement.vo';

export class ActorRoundMovementDto {
  @ApiProperty({ description: 'Base movement rate', example: 6 })
  bmr: number;

  @ApiProperty({ description: 'Movement penalty', example: 0 })
  penalty: number;

  @ApiProperty({ description: 'Max pace', example: 'normal' })
  maxPace: string;

  @ApiProperty({ description: 'Base difficulty', example: 'normal' })
  baseDifficulty: string;

  static fromEntity(entity: ActorRoundMovement): ActorRoundMovementDto {
    const dto = new ActorRoundMovementDto();
    dto.bmr = entity.bmr;
    dto.penalty = entity.penalty;
    dto.maxPace = entity.maxPace;
    dto.baseDifficulty = entity.baseDifficulty;
    return dto;
  }
}
