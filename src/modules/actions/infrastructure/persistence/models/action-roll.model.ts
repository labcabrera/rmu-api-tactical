import { Prop, Schema } from '@nestjs/mongoose';
import { KeyValueModifier } from './key-value-modifiers.model';

@Schema({ _id: false })
export class ActionRoll {
  @Prop({ type: [KeyValueModifier], required: false })
  modifiers: KeyValueModifier[];

  @Prop({ type: Number, required: false })
  roll: number | null;

  @Prop({ type: Number, required: false })
  totalRoll: number | null;
}
