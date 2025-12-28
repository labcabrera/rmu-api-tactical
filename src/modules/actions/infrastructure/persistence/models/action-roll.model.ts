import { Prop, Schema } from '@nestjs/mongoose';
import { KeyValueModifier } from './key-value-modifiers.model';

@Schema({ _id: false })
export class ActionRoll {
  @Prop({ type: [KeyValueModifier], required: false })
  modifiers: KeyValueModifier[];

  @Prop({ required: false })
  roll?: number;

  @Prop({ required: false })
  totalRoll?: number;
}
