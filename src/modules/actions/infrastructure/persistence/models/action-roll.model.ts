import { Prop, Schema } from '@nestjs/mongoose';
import { SkippedRuleModel } from './action-attack.model.js';
import { KeyValueModifier } from './key-value-modifiers.model.js';

@Schema({ _id: false })
export class ActionRoll {
  @Prop({ type: [KeyValueModifier], required: false })
  modifiers: KeyValueModifier[];

  @Prop({ type: Number, required: false })
  roll: number | null;

  @Prop({ type: Number, required: false })
  totalRoll: number | null;

  @Prop({ type: [SkippedRuleModel], required: false })
  skipped?: SkippedRuleModel[];
}
