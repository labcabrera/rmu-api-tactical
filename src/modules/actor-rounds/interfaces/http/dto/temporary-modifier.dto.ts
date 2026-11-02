import { ApiProperty } from '@nestjs/swagger';
import {
  type ItemConsumed,
  TEMPORARY_MODIFIER_KINDS,
  TEMPORARY_MODIFIER_SOURCES,
  type TemporaryModifier,
  type TemporaryModifierKind,
  type TemporaryModifierSource,
} from '../../../domain/value-objects/temporary-modifier.vo.js';

/** A lasting morale or fear RR modifier (workspace spec 068, decision 19). */
export class TemporaryModifierDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ type: String, enum: TEMPORARY_MODIFIER_KINDS })
  kind: TemporaryModifierKind;

  @ApiProperty({ example: 5 })
  value: number;

  @ApiProperty({ type: String, enum: TEMPORARY_MODIFIER_SOURCES })
  source: TemporaryModifierSource;

  @ApiProperty({ type: Number, nullable: true, description: 'Days of campaign it lasts; null until the game master removes it' })
  days: number | null;

  @ApiProperty()
  createdAt: string;

  @ApiProperty({ type: String, nullable: true, description: 'Game that created it; null when it came from the character' })
  tacticalGameId: string | null;

  static fromEntity(entity: TemporaryModifier): TemporaryModifierDto {
    return Object.assign(new TemporaryModifierDto(), entity);
  }
}

/** Units of a strategic item spent in the game (workspace spec 068, decision 7). */
export class ItemConsumedDto {
  @ApiProperty()
  itemId: string;

  @ApiProperty({ example: 1 })
  amount: number;

  static fromEntity(entity: ItemConsumed): ItemConsumedDto {
    return Object.assign(new ItemConsumedDto(), entity);
  }
}
