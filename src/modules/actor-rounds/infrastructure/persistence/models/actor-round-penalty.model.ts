import { Prop, Schema } from '@nestjs/mongoose';

@Schema({ _id: false })
export class ActorRoundPenaltyModifier {
  constructor(source: 'critical' | 'endurance' | 'hp', value: number) {
    this.source = source;
    this.value = value;
  }

  @Prop({ required: true })
  public readonly source: 'critical' | 'endurance' | 'hp';

  @Prop({ required: true })
  public readonly value: number;
}

@Schema({ _id: false })
export class ActorRoundPenalty {
  constructor(modifiers: ActorRoundPenaltyModifier[]) {
    this.modifiers = modifiers;
  }

  @Prop({ type: [ActorRoundPenaltyModifier], required: true })
  public readonly modifiers: ActorRoundPenaltyModifier[];
}
