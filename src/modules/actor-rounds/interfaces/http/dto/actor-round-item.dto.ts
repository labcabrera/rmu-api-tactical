import { ApiProperty } from '@nestjs/swagger';
import {
  type ActorRoundItem,
  ActorRoundItems,
  type ItemCondition,
  type ItemModifier,
} from '../../../domain/value-objects/actor-round-item.vo';

export class ActorRoundItemDto {
  @ApiProperty({ description: 'Strategic item identifier', example: 'item-001' })
  itemId: string;

  @ApiProperty({ example: 'Broadsword' })
  name: string;

  @ApiProperty({ required: false, example: 'broadsword' })
  itemTypeId?: string;

  @ApiProperty({ enum: ['weapon', 'shield', 'armor', 'other'] })
  kind: string;

  @ApiProperty({ required: false, enum: ['mainHand', 'offHand', 'body', 'head', 'arms', 'legs'] })
  slot?: string;

  @ApiProperty({ type: Number, description: 'Strength for the breakage checks', nullable: true, example: 80 })
  strength: number | null;

  @ApiProperty({ description: 'Modifiers it brought and the ones of the game', type: [Object] })
  modifiers: ItemModifier[];

  @ApiProperty({ description: 'Modifiers it brought into the game', type: [String] })
  startModifierIds: string[];

  @ApiProperty({ description: 'Breakage state with every modifier', type: Object })
  condition: ItemCondition;

  static fromEntity(entity: ActorRoundItem): ActorRoundItemDto {
    const dto = new ActorRoundItemDto();
    dto.itemId = entity.itemId;
    dto.name = entity.name;
    dto.itemTypeId = entity.itemTypeId;
    dto.kind = entity.kind;
    dto.slot = entity.slot;
    dto.strength = entity.strength;
    dto.modifiers = entity.modifiers.map(modifier => ({ ...modifier }));
    dto.startModifierIds = [...entity.startModifierIds];
    dto.condition = ActorRoundItems.condition(entity.modifiers);
    return dto;
  }
}
