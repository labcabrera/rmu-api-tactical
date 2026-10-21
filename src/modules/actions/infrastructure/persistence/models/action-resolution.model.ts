import { Prop, Schema } from '@nestjs/mongoose';
import type { ForceReason, ForcedApSource, ResolutionMode } from '../../../domain/value-objects/action-resolution.vo';

@Schema({ _id: false })
export class ActionResolutionModel {
  @Prop({ type: String, required: true })
  mode: ResolutionMode;

  @Prop({ type: String, required: false })
  reason?: ForceReason;

  @Prop({ type: String, required: false })
  apSource?: ForcedApSource;

  @Prop({ type: String, required: false })
  note?: string;
}

@Schema({ _id: false })
export class ActionApRangeModel {
  @Prop({ type: Number, required: true })
  min: number;

  @Prop({ type: Number, required: true })
  max: number;
}
