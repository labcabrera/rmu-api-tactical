import { Prop, Schema } from '@nestjs/mongoose';

@Schema({ _id: false })
export class KeyValueModifier {
  @Prop({ required: true })
  key: string;

  @Prop({ required: true })
  value: number;
}
