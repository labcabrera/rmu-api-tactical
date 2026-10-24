import { Prop, Schema } from '@nestjs/mongoose';
import type { WeaponCategory } from '../../../domain/value-objets/actor-round-attack.vo';

@Schema({ _id: false })
export class BoModifiers {
  @Prop({ required: true })
  key: string;

  @Prop({ type: String, required: false })
  subKey?: string;

  @Prop({ required: true })
  value: number;
}

export class AttackRange {
  @Prop({ required: true })
  from: number;

  @Prop({ required: true })
  to: number;

  @Prop({ required: true })
  bonus: number;
}

@Schema({ _id: false })
export class ActorRoundAttack {
  @Prop({ required: true })
  attackName: string;

  @Prop({ type: [BoModifiers], required: true })
  boModifiers: BoModifiers[];

  @Prop({ required: true })
  baseBo: number;

  @Prop({ required: true })
  currentBo: number;

  @Prop({ required: true })
  type: 'melee' | 'ranged';

  @Prop({ required: true })
  attackTable: string;

  @Prop({ required: true })
  fumbleTable: string;

  @Prop({ required: true })
  @Prop({ required: true, type: Number })
  attackSize: number;

  @Prop({ required: true })
  fumble: number;

  @Prop({ required: true })
  canThrow: boolean;

  @Prop({ type: Number, required: false })
  meleeRange: number | null;

  @Prop({ type: [AttackRange], required: false })
  ranges: AttackRange[] | null;

  @Prop({ type: Boolean, required: false, default: false })
  twoHanded: boolean;

  @Prop({ type: String, required: false, default: 'standard' })
  weaponCategory: WeaponCategory;

  @Prop({ type: String, required: false })
  skillId: string | null;

  @Prop({ type: String, required: false })
  itemId?: string | null;

  @Prop({ type: Number, required: false, default: 0 })
  breakagePenalty?: number;

  @Prop({ type: Boolean, required: false, default: false })
  broken?: boolean;
}
