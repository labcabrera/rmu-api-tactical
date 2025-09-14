import { Prop, Schema } from '@nestjs/mongoose';
import type { AttackType, CalledShot } from '../../../domain/value-objects/action-attack-modifiers.vo';

@Schema({ _id: false })
export class ActionAttackModifiers {
  @Prop({ type: String, required: true })
  public attackName: string;

  @Prop({ type: String, required: true })
  public type: AttackType;

  @Prop({ type: String, required: true })
  public targetId: string;

  @Prop({ type: Number, required: true })
  public bo: number;

  @Prop({ type: Number, required: true })
  public parry: number;

  @Prop({ type: String, required: true })
  public calledShot: CalledShot;

  @Prop({ type: String, required: true })
  public cover: string | undefined;

  @Prop({ type: String, required: true })
  public restrictedQuarters: string | undefined;

  @Prop({ type: String, required: true })
  public positionalSource: string | undefined;

  @Prop({ type: String, required: true })
  public positionalTarget: string | undefined;

  @Prop({ type: String, required: true })
  public dodge: string | undefined;

  @Prop({ type: Number, required: true })
  public range: number | undefined;

  @Prop({ type: Boolean, required: true })
  public disabledDB: boolean | undefined;

  @Prop({ type: Boolean, required: true })
  public disabledShield: boolean | undefined;

  @Prop({ type: Boolean, required: true })
  public disabledParry: boolean | undefined;

  @Prop({ type: Number, required: true })
  public customBonus: number | undefined;
}
