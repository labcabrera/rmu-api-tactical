import { Prop, Schema } from '@nestjs/mongoose';
import type { DefenseLevel } from '../../../domain/value-objets/actor-round-defense-mode.vo';

@Schema({ _id: false })
export class ActorRoundFatigue {
  @Prop({ required: true })
  fatigue: number;

  @Prop({ required: true })
  endurance: number;

  @Prop({ required: true })
  accumulator: number;
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
}

@Schema({ _id: false })
export class ActorRoundDefenseMode {
  @Prop({ type: String, required: true, default: 'none' })
  dodge: DefenseLevel;

  @Prop({ type: String, required: true, default: 'none' })
  block: DefenseLevel;
}
