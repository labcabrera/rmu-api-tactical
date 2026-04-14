import { ApiProperty } from '@nestjs/swagger';
import type { ActorRoundAlertStatus } from '../../../domain/value-objets/actor-round-alert-status.vo';
import type { ActorRoundAlertType } from '../../../domain/value-objets/actor-round-alert-type.vo';
import { ActorRoundAlert } from '../../../domain/value-objets/actor-round-alert.vo';
import { ActorRoundAlertModifierDto } from './actor-round-alert-modifier.dto';

export class ActorRoundAlertDto {
  constructor(
    id: string,
    type: ActorRoundAlertType,
    message: string,
    modifiers: { key: string; value: number; modifier: string }[] | undefined,
    status: ActorRoundAlertStatus,
  ) {
    this.id = id;
    this.type = type;
    this.message = message;
    this.modifiers = modifiers;
    this.status = status;
  }

  @ApiProperty({ description: 'Alert identifier', example: 'a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6' })
  id: string;

  @ApiProperty({ description: 'Type of alert', example: 'endurance' })
  type: ActorRoundAlertType;

  @ApiProperty({ description: 'Message of alert', example: 'High stamina', required: true })
  message: string;

  @ApiProperty({
    description: 'Optional modifiers applied to the alert',
    type: [ActorRoundAlertModifierDto],
    required: false,
  })
  modifiers?: ActorRoundAlertModifierDto[];

  @ApiProperty({ description: 'Status of the alert', example: 'pending' })
  status: ActorRoundAlertStatus;

  static fromEntity(alert: ActorRoundAlert): ActorRoundAlertDto {
    return new ActorRoundAlertDto(
      alert.id,
      alert.type,
      alert.message,
      alert.modifiers ? alert.modifiers.map(m => ActorRoundAlertModifierDto.fromEntity(m)) : undefined,
      alert.status,
    );
  }
}
