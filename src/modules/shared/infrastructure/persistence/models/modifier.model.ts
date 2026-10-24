import { Prop, Schema } from '@nestjs/mongoose';
import type { ModifierGroup } from '../../../../actions/domain/value-objects/key-value-modifier.vo.js';

@Schema({ _id: false })
export class Modifier {
  @Prop({ type: String, required: true })
  public key: string;

  @Prop({ type: Number, required: true })
  public value: number;

  @Prop({ type: String, required: false })
  public group?: ModifierGroup;

  @Prop({ type: String, required: false })
  public source?: string;
}
