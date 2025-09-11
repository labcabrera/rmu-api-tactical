import { Prop, Schema } from '@nestjs/mongoose';
import { Modifier } from '../../../../shared/infrastructure/persistence/models/modier.model';
import type { AttackType, ParryType } from '../../../domain/entities/action-attack.vo';
import type { ActionStatus } from '../../../domain/entities/action-status.vo';

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

export class ActionAttackCalculated {
  @Prop({ type: [Modifier], required: true })
  public rollModifiers: Modifier[];

  @Prop({ type: Number, required: true })
  public rollTotal: number;
}

@Schema({ _id: false })
export class ActionAttackParry {
  @Prop({ type: String, required: true })
  public parryActorId: string;

  @Prop({ type: String, required: true })
  public targetId: string;

  @Prop({ type: String, required: true })
  public parryType: ParryType;

  @Prop({ type: Number, required: true })
  public parryAvailable: number;

  @Prop({ type: Number, required: true })
  public parry: number;
}

@Schema({ _id: false })
export class ActionAttackRoll {
  @Prop({ type: Number, required: true })
  public roll: number;
}

@Schema({ _id: false })
export class ActionAttack {
  @Prop({ type: ActionAttackModifiers, required: true })
  public modifiers: ActionAttackModifiers;

  @Prop({ type: [ActionAttackParry], required: false })
  public parries: ActionAttackParry[] | undefined;

  @Prop({ type: ActionAttackRoll, required: false })
  public roll: ActionAttackRoll | undefined;

  @Prop({ type: ActionAttackCalculated, required: true })
  public calculated: ActionAttackCalculated | undefined;

  @Prop({ type: String, required: false })
  public externalAttackId: string | undefined;

  @Prop({ type: String, required: true })
  public status: ActionStatus;
}
