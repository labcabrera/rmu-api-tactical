import { ApiProperty } from '@nestjs/swagger';
import type { ActorRoundAlertType } from '../../../domain/value-objets/actor-round-alert-type.vo';
import { ActorRoundAlert } from '../../../domain/value-objets/actor-round-alert.vo';

export class ActorRoundAlertDto {
  @ApiProperty({ description: 'Alert identifier', example: 'a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6' })
  id: string;

  @ApiProperty({ description: 'Type of alert', example: 'endurance' })
  type: ActorRoundAlertType;

  @ApiProperty({ description: 'Value of alert', example: 'High stamina' })
  value: string | undefined;

  static fromEntity(alert: ActorRoundAlert): ActorRoundAlertDto {
    const dto = new ActorRoundAlertDto();
    dto.id = alert.id;
    dto.type = alert.type;
    dto.value = alert.value;
    return dto;
  }
}
