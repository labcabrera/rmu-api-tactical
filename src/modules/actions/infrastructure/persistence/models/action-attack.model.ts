import { Prop, Schema } from '@nestjs/mongoose';
import { Modifier } from '../../../../shared/infrastructure/persistence/models/modier.model';
import type { AttackType } from '../../../domain/value-objects/action-attack-modifiers.vo';
import { AttackLocation } from '../../../domain/value-objects/attack-location.vo';
import type { AttackStatus } from '../../../domain/value-objects/attack-status.vo';
import { ActionAttackModifiers } from './action-attack-modifiers.model';

@Schema({ _id: false })
export class ActionAttackCalculated {
  @Prop({ type: [Modifier], required: true })
  public rollModifiers: Modifier[];

  @Prop({ type: Number, required: true })
  public rollTotal: number;

  @Prop({ type: String, required: false })
  public location: AttackLocation | undefined;

  @Prop({ type: Boolean, required: true })
  public requiredLocationRoll: boolean;
}

@Schema({ _id: false })
export class AttackTableEntry {
  @Prop({ type: String, required: true })
  public text: string;

  @Prop({ type: Number, required: true })
  public damage: number;

  @Prop({ type: String, required: true })
  public criticalType: string | undefined;

  @Prop({ type: String, required: true })
  public criticalSeverity: string | undefined;
}

@Schema({ _id: false })
export class CriticalEffect {
  @Prop({ type: String, required: true })
  public status: string;

  @Prop({ type: Number, required: false })
  public rounds: number | undefined;

  @Prop({ type: Number, required: false })
  public value: number | undefined;

  @Prop({ type: Number, required: false })
  public delay: number | undefined;

  @Prop({ type: String, required: false })
  public condition: string | undefined;
}

@Schema({ _id: false })
export class CriticalResult {
  @Prop({ type: String, required: true })
  public text: string;

  @Prop({ type: Number, required: true })
  public damage: number;

  @Prop({ type: String, required: true })
  public location: string;

  @Prop({ type: [CriticalEffect], required: true })
  public effects: CriticalEffect[];
}

@Schema({ _id: false })
export class ActionAttackRoll {
  @Prop({ type: Number, required: true })
  public roll: number;

  @Prop({ type: Number, required: false })
  public locationRoll: number | undefined;

  @Prop({ type: Map, of: Number, default: {} })
  public criticalRolls: Map<string, number | undefined> | undefined;

  @Prop({ type: Number, required: false })
  public fumbleRoll: number | undefined;
}

@Schema({ _id: false })
export class Critical {
  @Prop({ type: String, required: true })
  public key: string;

  @Prop({ type: String, required: true })
  public status: string;

  @Prop({ type: String, required: true })
  public criticalType: string;

  @Prop({ type: String, required: true })
  public criticalSeverity: string;

  @Prop({ type: Number, required: false })
  public adjustedRoll: number | undefined;

  @Prop({ type: CriticalResult, required: false })
  public result: CriticalResult | undefined;
}

@Schema({ _id: false })
export class Fumble {
  @Prop({ type: String, required: true })
  public status: string;

  @Prop({ type: String, required: false })
  public text: string | undefined;

  @Prop({ type: String, required: false })
  public additionalDamageText: string | undefined;

  @Prop({ type: Number, required: false })
  public damage: number | undefined;

  @Prop({ type: [CriticalEffect], required: false })
  public effects: CriticalEffect[] | undefined;
}

@Schema({ _id: false })
export class ActionAttackResult {
  @Prop({ type: AttackTableEntry, required: false })
  public attackTableEntry: AttackTableEntry | undefined;

  @Prop({ type: [Critical], required: false })
  public criticals: Critical[] | undefined;

  @Prop({ type: Fumble, required: false })
  public fumble: Fumble | undefined;
}

@Schema({ _id: false })
export class ActionAttack {
  @Prop({ type: String, required: true })
  public attackName: string;

  @Prop({ type: String, required: true })
  public type: AttackType;

  @Prop({ type: ActionAttackModifiers, required: true })
  public modifiers: ActionAttackModifiers;

  @Prop({ type: ActionAttackRoll, required: false })
  public roll: ActionAttackRoll | undefined;

  @Prop({ type: ActionAttackCalculated, required: false })
  public calculated: ActionAttackCalculated | undefined;

  @Prop({ type: ActionAttackResult, required: false })
  public results: ActionAttackResult | undefined;

  @Prop({ type: String, required: false })
  public externalAttackId: string | undefined;

  @Prop({ type: String, required: true })
  public status: AttackStatus;
}
