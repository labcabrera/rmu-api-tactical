import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ _id: false })
export class CharacterInfo {
  @Prop({ required: true })
  level: number;

  @Prop({ required: true })
  race: string;

  @Prop({ required: true })
  sizeId: string;

  @Prop({ required: true })
  height: number;

  @Prop({ required: true })
  weight: number;
}

@Schema({ _id: false })
export class Stat {
  @Prop({ required: true })
  bonus: number;

  @Prop({ required: true })
  racial: number;

  @Prop({ required: true })
  custom: number;

  @Prop({ required: true })
  totalBonus: number;
}

@Schema({ _id: false })
export class CharacterStatistics {
  @Prop({ required: true })
  ag: Stat;
  @Prop({ required: true })
  co: Stat;
  @Prop({ required: true })
  em: Stat;
  @Prop({ required: true })
  in: Stat;
  @Prop({ required: true })
  me: Stat;
  @Prop({ required: true })
  pr: Stat;
  @Prop({ required: true })
  qu: Stat;
  @Prop({ required: true })
  re: Stat;
  @Prop({ required: true })
  sd: Stat;
  @Prop({ required: true })
  st: Stat;
}

@Schema({ _id: false })
export class CharacterMovement {
  @Prop({ required: true })
  baseMovementRate: number;

  @Prop({ required: true })
  strideRacialBonus: number;

  @Prop({ required: true })
  strideQuBonus: number;

  @Prop({ required: true })
  strideCustomBonus: number;
}

@Schema({ _id: false })
export class CharacterDefense {
  @Prop({ required: true })
  armorType: number;

  @Prop({ required: true })
  defensiveBonus: number;
}

@Schema({ _id: false })
export class CharacterHP {
  @Prop({ required: true })
  customBonus: number;

  @Prop({ required: true })
  racialBonus: number;

  @Prop({ required: true })
  skillBonus: number;

  @Prop({ required: true })
  max: number;

  @Prop({ required: true })
  current: number;
}

@Schema({ _id: false })
export class CharacterEndurance {
  @Prop({ required: true })
  customBonus: number;

  @Prop({ required: true })
  max: number;

  @Prop({ required: true })
  current: number;

  @Prop({ required: true })
  accumulator: number;

  @Prop({ required: true })
  fatiguePenalty: number;
}

@Schema({ _id: false })
export class CharacterPower {
  @Prop({ required: true })
  max: number;

  @Prop({ required: true })
  current: number;
}

@Schema({ _id: false })
export class CharacterInitiative {
  @Prop({ required: true })
  baseBonus: number;

  @Prop({ required: true })
  customBonus: number;

  @Prop({ required: true })
  penaltyBonus: number;

  @Prop({ required: true })
  totalBonus: number;
}

@Schema({ _id: false })
export class CharacterSkill {
  @Prop({ required: true })
  skillId: string;

  @Prop({ type: String, required: false })
  specialization: string | undefined;

  @Prop({ type: [String], required: true })
  statistics: string[];

  @Prop({ required: true })
  ranks: number;

  @Prop({ required: true })
  statBonus: number;

  @Prop({ required: true })
  racialBonus: number;

  @Prop({ required: true })
  developmentBonus: number;

  @Prop({ required: true })
  customBonus: number;

  @Prop({ required: true })
  totalBonus: number;
}

@Schema({ _id: false })
export class CharacterItemInfo {
  @Prop({ required: false })
  length: number;

  @Prop({ required: false })
  strength: number;

  @Prop({ required: false })
  weight: number;

  @Prop({ required: false })
  productionTime: number;
}

@Schema({ _id: false })
export class CharacterItemWeapon {
  @Prop({ required: true })
  attackTable: string;

  @Prop({ required: true })
  skillId: string;

  @Prop({ required: true })
  fumble: number;

  @Prop({ required: true })
  sizeAdjustment: number;

  @Prop({ required: true })
  requiredHands: number;

  @Prop({ required: true })
  throwable: boolean;
}

@Schema({ _id: false })
export class CharacterItemWeaponRange {
  @Prop({ required: true })
  from: number;

  @Prop({ required: true })
  to: number;

  @Prop({ required: true })
  bonus: number;
}

@Schema({ _id: false })
export class CharacterItemArmor {
  @Prop({ required: true })
  slot: string;

  @Prop({ required: true })
  armorType: number;

  @Prop({ required: true })
  enc: number;

  @Prop({ required: true })
  maneuver: number;

  @Prop({ required: true })
  rangedPenalty: number;

  @Prop({ required: true })
  perception: number;
}

@Schema({ _id: false })
export class CharacterItem {
  @Prop({ required: true })
  id: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  itemTypeId: string;

  @Prop({ required: true })
  category: string;

  @Prop({ type: CharacterItemWeapon, required: false })
  weapon: CharacterItemWeapon | undefined;

  @Prop({ type: [CharacterItemWeaponRange], required: false })
  weaponRange: CharacterItemWeaponRange[] | undefined;

  @Prop({ type: CharacterItemArmor, required: false })
  armor: CharacterItemArmor | undefined;

  @Prop({ required: true })
  info: CharacterItemInfo;
}

@Schema({ _id: false })
export class CharacterEquipment {
  @Prop({ type: String, required: false })
  mainHand: string | undefined;

  @Prop({ type: String, required: false })
  offHand: string | undefined;

  @Prop({ type: String, required: false })
  body: string | undefined;

  @Prop({ type: String, required: false })
  head: string | undefined;

  @Prop({ type: Number, required: false })
  weight: number | undefined;
}

export const CharacterInfoSchema = SchemaFactory.createForClass(CharacterInfo);
