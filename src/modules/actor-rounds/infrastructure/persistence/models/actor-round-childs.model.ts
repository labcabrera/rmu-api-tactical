import { Prop, Schema } from '@nestjs/mongoose';
import type { DefenseLevel } from '../../../domain/value-objects/actor-round-defense-mode.vo.js';
import type { InjurySource } from '../../../domain/value-objects/injury.vo.js';

@Schema({ _id: false })
export class ActorRoundFatigue {
  @Prop({ required: true })
  fatigue: number;

  @Prop({ required: true })
  endurance: number;

  @Prop({ required: true })
  accumulator: number;

  /** Workspace spec 077, decision D7: rounds in a row without exertion. */
  @Prop({ type: Number, required: false })
  restRounds?: number;

  /** Workspace spec 077, decision D7: the actor exerted itself this round. */
  @Prop({ type: Boolean, required: false })
  exerted?: boolean;
}

export class ActorRoundParry {
  @Prop({ required: true })
  attackName: string;

  @Prop({ required: true })
  parryValue: number;
}

@Schema({ _id: false })
export class ActorRoundEffect {
  @Prop({ required: true })
  id: string;

  @Prop({ required: true })
  status: string;

  @Prop({ type: Number, required: false })
  value: number | undefined;

  @Prop({ type: Number, required: false })
  rounds: number | undefined;

  @Prop({ type: Number, required: false })
  appliedRound?: number;

  @Prop({ type: Number, required: false })
  appliedPhase?: number;

  @Prop({ type: Number, required: false })
  spentApBefore?: number;

  @Prop({ type: String, required: false })
  targetActorId?: string;

  /** Spec 013: the critical, fumble or condition the effect comes from. */
  @Prop({ type: Object, required: false })
  source?: InjurySource;

  /** Spec 034: first round a delayed effect counts in. */
  @Prop({ type: Number, required: false })
  fromRound?: number;

  /** Spec 068: the cause of a dying effect was treated. */
  @Prop({ type: Boolean, required: false })
  causeTreated?: boolean;

  /** Workspace spec 076: data of the effect (`aiming` item, `critical-reroll` kind, `precision` OB penalty). */
  @Prop({ type: Object, required: false })
  data?: Record<string, unknown>;
}

@Schema({ _id: false })
export class ActorRoundSnapshot {
  @Prop({ type: Number, required: true })
  hp: number;

  @Prop({ type: [String], required: true, default: [] })
  injuryIds: string[];

  @Prop({ type: [String], required: true, default: [] })
  conditionIds: string[];

  /** Workspace spec 077, decision D10: fatigue penalty points the character brought. */
  @Prop({ type: Number, required: false })
  fatigue?: number;
}

@Schema({ _id: false })
export class ActorRoundTrait {
  @Prop({ type: String, required: true })
  traitId: string;

  @Prop({ type: Number, required: true, default: 1 })
  tier: number;

  @Prop({ type: String, required: false })
  specialization: string | null;
}

@Schema({ _id: false })
export class ActorRoundPhaseLog {
  @Prop({ type: Number, required: true })
  phase: number;

  @Prop({ type: Number, required: true })
  spentAp: number;

  @Prop({ type: Number, required: true })
  totalSpentAp: number;
}

@Schema({ _id: false })
export class ActorRoundApModifier {
  @Prop({ type: String, required: true })
  source: string;

  @Prop({ type: String, required: true })
  kind: string;

  @Prop({ type: Number, required: true })
  value: number;

  @Prop({ type: Number, required: false })
  phase?: number;

  @Prop({ type: String, required: false })
  effectId?: string;
}

@Schema({ _id: false })
export class ActorRoundApLedgerEntry {
  @Prop({ type: Number, required: true })
  phase: number;

  @Prop({ type: String, required: false })
  actionId?: string;

  @Prop({ type: Number, required: true })
  ap: number;

  @Prop({ type: String, required: true })
  kind: string;

  /** Workspace spec 077: spent while concentrating on something else. */
  @Prop({ type: Boolean, required: false })
  concentrated?: boolean;
}

/** Workspace spec 077: a held action of the actor, a concentration focus. */
@Schema({ _id: false })
export class ActorRoundHeldAction {
  @Prop({ type: String, required: true })
  actionId: string;

  @Prop({ type: Number, required: true })
  since: number;
}

@Schema({ _id: false })
export class ActorRoundDefenseMode {
  @Prop({ type: String, required: true, default: 'none' })
  dodge: DefenseLevel;

  @Prop({ type: String, required: true, default: 'none' })
  block: DefenseLevel;

  /** Workspace spec 079, decision B3: a full dodge of Adrenal Defense. */
  @Prop({ type: Boolean, required: false })
  adrenal?: boolean;
}

/** A change of the hits of the round (spec 013, §1.1). */
@Schema({ _id: false })
export class ActorRoundHpLogEntry {
  @Prop({ type: String, required: true })
  id: string;

  @Prop({ type: Number, required: true })
  round: number;

  @Prop({ type: Number, required: false })
  phase?: number;

  @Prop({ type: Number, required: true })
  amount: number;

  @Prop({ type: String, required: true })
  kind: string;

  @Prop({ type: String, required: false })
  actionId?: string;

  @Prop({ type: String, required: false })
  attackerId?: string;

  @Prop({ type: String, required: false })
  attackerName?: string;

  @Prop({ type: String, required: false })
  injuryId?: string;

  @Prop({ type: String, required: false })
  criticalKey?: string;

  @Prop({ type: String, required: true })
  at: string;
}
