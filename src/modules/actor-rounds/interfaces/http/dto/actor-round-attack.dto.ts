import { ApiProperty } from '@nestjs/swagger';
import { ActorRoundAttack, type WeaponCategory } from '../../../domain/value-objects/actor-round-attack.vo.js';
import { BoModifiers } from '../../../infrastructure/persistence/models/actor-round-attack.model.js';
import { AttackRangeDto } from './attack-range.dto.js';

export class BoModifiersDto {
  key: string;
  subKey?: string;
  value: number;

  static fromEntity(entity: BoModifiers): BoModifiersDto {
    const dto = new BoModifiersDto();
    dto.key = entity.key;
    dto.subKey = entity.subKey;
    dto.value = entity.value;
    return dto;
  }
}

export class ActorRoundAttackDto {
  attackName: string;
  boModifiers: BoModifiersDto[];
  /** Base attack without modifiers readed from character */
  baseBo: number;
  /** Current attack less parry amount and penalties applied */
  currentBo: number;
  type: 'melee' | 'ranged';
  attackTable: string;
  fumbleTable: string;
  attackSize: number;
  fumble: number;
  canThrow: boolean;
  ranges: AttackRangeDto[] | undefined;
  twoHanded: boolean;
  weaponCategory: WeaponCategory;
  /** Skill of the weapon, such as `melee-weapon@blade`; null for older actor rounds. */
  skillId: string | null;

  @ApiProperty({ type: String, description: 'Item of the attack (spec 019)', nullable: true, required: false })
  itemId: string | null;

  @ApiProperty({ description: 'Breakage damage of the item in the game, in currentBo', example: 0 })
  breakagePenalty: number;

  @ApiProperty({ description: 'The item broke in the game: the attack cannot be declared', example: false })
  broken: boolean;

  @ApiProperty({ type: [String], description: 'Tags of the weapon type (spec 032)', example: ['fencing'] })
  weaponTags: string[];

  static fromEntity(entity: ActorRoundAttack): ActorRoundAttackDto {
    const dto = new ActorRoundAttackDto();
    dto.attackName = entity.attackName;
    dto.boModifiers = entity.boModifiers.map(e => BoModifiersDto.fromEntity(e));
    dto.baseBo = entity.baseBo;
    dto.currentBo = entity.currentBo;
    dto.type = entity.type;
    dto.attackTable = entity.attackTable;
    dto.fumbleTable = entity.fumbleTable;
    dto.attackSize = entity.attackSize;
    dto.fumble = entity.fumble;
    dto.canThrow = entity.canThrow;
    dto.twoHanded = entity.twoHanded ?? false;
    dto.weaponCategory = entity.weaponCategory ?? 'standard';
    dto.skillId = entity.skillId ?? null;
    dto.itemId = entity.itemId ?? null;
    dto.breakagePenalty = entity.breakagePenalty ?? 0;
    dto.broken = entity.broken ?? false;
    dto.weaponTags = [...(entity.weaponTags ?? [])];
    dto.ranges = entity.ranges && entity.ranges.length > 0 ? entity.ranges.map(r => AttackRangeDto.fromEntity(r)) : undefined;
    return dto;
  }
}
