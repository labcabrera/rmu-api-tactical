import { Prop, Schema } from '@nestjs/mongoose';

@Schema({ _id: false })
export class Modifier {
  @Prop({ type: String, required: true })
  public key: string;

  @Prop({ type: Number, required: true })
  public value: number;
}
