import { Prop, Schema } from '@nestjs/mongoose';
import type { ActorRoundAlertStatus } from '../../../domain/value-objects/actor-round-alert-status.vo.js';
import type { ActorRoundAlertType } from '../../../domain/value-objects/actor-round-alert-type.vo.js';
import type { AlertResult, ReactionAlertData } from '../../../domain/value-objects/actor-round-alert.vo.js';

@Schema({ _id: false })
export class ActorRoundAlertModifier {
  @Prop({ type: String, required: true })
  key: string;

  @Prop({ type: Number, required: false })
  value: number | null;

  @Prop({ type: String, required: false })
  modifier: string | null;
}

@Schema({ _id: false })
export class ActorRoundAlert {
  @Prop({ required: true })
  id: string;

  @Prop({ type: String, required: true })
  type: ActorRoundAlertType;

  @Prop({ type: String, required: true })
  message: string;

  @Prop({ type: [ActorRoundAlertModifier], required: false })
  modifiers: ActorRoundAlertModifier[] | null;

  @Prop({ type: String, required: true, default: 'pending' })
  status: ActorRoundAlertStatus;

  /** Workspace spec 076: the reaction of a `reaction-available` alert. */
  @Prop({ type: Object, required: false })
  reaction?: ReactionAlertData | null;

  /** Workspace spec 087: the round it was raised in, and the round, phase and time it was resolved in, with its result. */
  @Prop({ type: Number, required: false })
  raisedRound?: number | null;

  @Prop({ type: Number, required: false })
  resolvedRound?: number | null;

  @Prop({ type: Number, required: false })
  resolvedPhase?: number | null;

  @Prop({ type: String, required: false })
  resolvedAt?: string | null;

  @Prop({ type: Object, required: false })
  result?: AlertResult | null;
}
