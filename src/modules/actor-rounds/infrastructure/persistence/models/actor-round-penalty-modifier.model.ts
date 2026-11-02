import { Prop, Schema } from '@nestjs/mongoose';
import type { ActorRoundPenaltySource } from '../../../domain/value-objects/actor-round-penalty-source.vo.js';

@Schema({ _id: false })
export class ActorRoundPenaltyModifier {
  constructor(id: string, source: ActorRoundPenaltySource, value: number) {
    this.id = id;
    this.source = source;
    this.value = value;
  }

  @Prop({ type: String, required: true })
  public readonly id: string;

  @Prop({ type: String, required: true })
  public readonly source: ActorRoundPenaltySource;

  @Prop({ type: Number, required: true })
  public readonly value: number;
}
