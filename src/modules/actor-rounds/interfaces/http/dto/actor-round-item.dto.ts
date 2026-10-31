import { ApiProperty } from '@nestjs/swagger';
import {
  type ActorRoundItem,
  ActorRoundItems,
  type ItemCoating,
  type ItemCondition,
  type ItemModifier,
  type SpentCoating,
} from '../../../domain/value-objects/actor-round-item.vo.js';

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

  @ApiProperty({ description: 'Poison on the weapon; null once a hit spent it', type: Object, nullable: true, required: false })
  coating?: ItemCoating | null;

  @ApiProperty({
    description: 'The coating it brought, spent in the game, by its appliedAt (`true` in rounds stored before spec 044)',
    type: Object,
    required: false,
  })
  coatingSpent?: SpentCoating;

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
    if (entity.coating !== undefined) dto.coating = entity.coating && structuredClone(entity.coating);
    if (entity.coatingSpent !== undefined) dto.coatingSpent = entity.coatingSpent === true ? true : { ...entity.coatingSpent };
    return dto;
  }
}
