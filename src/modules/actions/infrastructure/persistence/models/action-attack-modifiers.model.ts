import { Prop, Schema } from '@nestjs/mongoose';
import type { AttackType, CalledShot } from '../../../domain/value-objects/action-attack-modifiers.vo';

@Schema({ _id: false })
export class ActionAttackModifiers {
  @Prop({ type: String, required: true })
  public attackName: string;

  @Prop({ type: String, required: true })
  public type: AttackType;

  @Prop({ type: String, required: false })
  public targetId: string | undefined;

  @Prop({ type: Number, required: false })
  public bo: number | undefined;

  @Prop({ type: Number, required: false })
  public parry: number | undefined;

  @Prop({ type: String, required: false })
  public calledShot: CalledShot | undefined;

  @Prop({ type: Number, required: false })
  public calledShotPenalty: number | undefined;

  @Prop({ type: String, required: false })
  public positionalSource: string | undefined;

  @Prop({ type: String, required: false })
  public positionalTarget: string | undefined;

  @Prop({ type: String, required: false })
  public restrictedQuarters: string | undefined;

  @Prop({ type: String, required: false })
  public cover: string | undefined;

  @Prop({ type: String, required: false })
  public dodge: string | undefined;

  @Prop({ type: Boolean, required: false })
  public disabledDB: boolean | undefined;

  @Prop({ type: Boolean, required: false })
  public disabledShield: boolean | undefined;

  @Prop({ type: Boolean, required: false })
  public disabledParry: boolean | undefined;

  @Prop({ type: String, required: false })
  public pace: string | undefined;

  @Prop({ type: Boolean, required: false })
  public restrictedParry: boolean | undefined;

  @Prop({ type: Boolean, required: false })
  public higherGround: boolean | undefined;

  @Prop({ type: Boolean, required: false })
  public stunnedFoe: boolean | undefined;

  @Prop({ type: Boolean, required: false })
  public surprisedFoe: boolean | undefined;

  @Prop({ type: Boolean, required: false })
  public proneSource: boolean | undefined;

  @Prop({ type: Boolean, required: false })
  public proneTarget: boolean | undefined;

  @Prop({ type: Boolean, required: false })
  public offHand: boolean | undefined;

  @Prop({ type: Boolean, required: false })
  public ambush: boolean | undefined;

  @Prop({ type: Number, required: false })
  public range: number | undefined;

  @Prop({ type: Number, required: false })
  public customBonus: number | undefined;
}
