import { Prop, Schema } from '@nestjs/mongoose';
import { ActorRoundPenaltyModifier } from './actor-round-penalty-modifier.model';

@Schema({ _id: false })
export class ActorRoundPenalty {
  constructor(modifiers: ActorRoundPenaltyModifier[]) {
    this.modifiers = modifiers;
  }

  @Prop({ type: [ActorRoundPenaltyModifier], required: true })
  public readonly modifiers: ActorRoundPenaltyModifier[];
}
