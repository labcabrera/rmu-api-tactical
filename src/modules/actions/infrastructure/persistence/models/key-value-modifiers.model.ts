import { Prop, Schema } from '@nestjs/mongoose';
import type { ModifierGroup, ModifierParams } from '../../../domain/value-objects/key-value-modifier.vo.js';

@Schema({ _id: false })
export class KeyValueModifier {
  @Prop({ required: true })
  key: string;

  @Prop({ required: true })
  value: number;

  /** Workspace spec 052: the breakdown group, the rule reference and the inputs of its explanation. */
  @Prop({ type: String, required: false })
  group?: ModifierGroup;

  @Prop({ type: String, required: false })
  source?: string;

  @Prop({ type: String, required: false })
  rule?: string;

  @Prop({ type: Object, required: false })
  params?: ModifierParams;
}
