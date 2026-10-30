import { Prop, Schema } from '@nestjs/mongoose';
import { Modifier } from '../../../../shared/infrastructure/persistence/models/modifier.model.js';
import type { AttackType, ProtectPosition } from '../../../domain/value-objects/action-attack-modifiers.vo.js';
import type { AttackLocation } from '../../../domain/value-objects/attack-location.vo.js';
import type { ModifierGroup } from '../../../domain/value-objects/key-value-modifier.vo.js';
import type { AttackStatus } from '../../../domain/value-objects/attack-status.vo.js';
import { ActionAttackModifiers } from './action-attack-modifiers.model.js';

@Schema({ _id: false })
export class SkippedRuleModel {
  @Prop({ type: String, required: true })
  public source: string;

  @Prop({ type: String, required: true })
  public group: ModifierGroup;

  @Prop({ type: String, required: true })
  public reason: string;

  @Prop({ type: String, required: true })
  public phase: string;

  @Prop({ type: String, required: false })
  public rule?: string;

  @Prop({ type: Object, required: false })
  public params?: Record<string, number | string | boolean>;
}

@Schema({ _id: false })
export class ActionAttackCalculated {
  @Prop({ type: [Modifier], required: true })
  public rollModifiers: Modifier[];

  @Prop({ type: [Modifier], required: false })
  public criticalModifiers: Modifier[] | undefined;

  @Prop({ type: Number, required: true })
  public rollTotal: number;

  @Prop({ type: String, required: false })
  public location: AttackLocation | undefined;

  @Prop({ type: Number, required: false })
  public criticalAdjustment: number | undefined;

  @Prop({ type: Boolean, required: false })
  public breakageRoll: boolean | undefined;

  @Prop({ type: Number, required: false })
  public fumble: number | undefined;

  @Prop({ type: [SkippedRuleModel], required: false })
  public skipped: SkippedRuleModel[] | undefined;
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

  @Prop({ type: String, required: false })
  public applyTo?: 'source' | 'target';

  @Prop({ type: String, required: false })
  public location?: string;

  @Prop({ type: String, required: false })
  public severity?: string;

  @Prop({ type: String, required: false })
  public dice?: string;
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

  /** Spec 013, §2: injury data of the critical entry. */
  @Prop({ type: Object, required: false })
  public injury?: { type: string; secondary?: string[]; flags?: string[] };
}

@Schema({ _id: false })
export class ActionAttackRoll {
  @Prop({ type: Number, required: true })
  public roll: number;

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

  @Prop({ type: Object, required: false })
  public styleOption: { abilityId: string; originalType: string; originalSeverity: string } | undefined;
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

  /** Id of the attack in rmu-api-attack, no longer used: kept so that older actions still load. */
  @Prop({ type: String, required: false })
  public externalAttackId?: string;

  @Prop({ type: String, required: true })
  public status: AttackStatus;

  @Prop({ type: [String], required: false })
  public protectors: string[] | null;

  @Prop({ type: Object, required: false })
  public protectorPositions?: Record<string, ProtectPosition>;
}
