import { ActorRoundAttack, BoModifiers } from '../../../domain/entities/actor-round.entity';

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
  attackType: 'melee' | 'ranged';
  attackTable: string;
  fumbleTable: string;
  attackSize: 'small' | 'medium' | 'big';
  fumble: number;
  canThrow: boolean;

  static fromEntity(entity: ActorRoundAttack): ActorRoundAttackDto {
    const dto = new ActorRoundAttackDto();
    dto.attackName = entity.attackName;
    dto.boModifiers = entity.boModifiers.map((e) => BoModifiersDto.fromEntity(e));
    dto.baseBo = entity.baseBo;
    dto.currentBo = entity.currentBo;
    dto.attackType = entity.attackType;
    dto.attackTable = entity.attackTable;
    dto.fumbleTable = entity.fumbleTable;
    dto.attackSize = entity.attackSize;
    dto.fumble = entity.fumble;
    dto.canThrow = entity.canThrow;
    return dto;
  }
}
