import { ApiProperty } from '@nestjs/swagger';
import type { ActorRoundAlertStatus } from '../../../domain/value-objets/actor-round-alert-status.vo';
import type { ActorRoundAlertType } from '../../../domain/value-objets/actor-round-alert-type.vo';
import { ActorRoundAlert } from '../../../domain/value-objets/actor-round-alert.vo';

export class ActorRoundAlertDto {
  @ApiProperty({ description: 'Alert identifier', example: 'a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6' })
  id: string;

  @ApiProperty({ description: 'Type of alert', example: 'endurance' })
  type: ActorRoundAlertType;

  @ApiProperty({ description: 'Message of alert', example: 'High stamina', required: true })
  message: string;

  @ApiProperty({ description: 'Optional modifiers applied to the alert', type: [Object], required: false })
  modifiers?: { key: string; value: number; modifier: string }[];

  @ApiProperty({ description: 'Status of the alert', example: 'pending' })
  status: ActorRoundAlertStatus;

  static fromEntity(alert: ActorRoundAlert): ActorRoundAlertDto {
    const dto = new ActorRoundAlertDto();
    dto.id = alert.id;
    dto.type = alert.type;
    dto.message = alert.message;
    dto.modifiers = alert.modifiers
      ? alert.modifiers.map((m) => ({ key: m.key, value: m.value, modifier: m.modifier }))
      : undefined;
    dto.status = (alert as any).status ?? 'pending';
    return dto;
  }
}
