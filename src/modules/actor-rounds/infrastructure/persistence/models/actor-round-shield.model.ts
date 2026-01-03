import { Prop, Schema } from '@nestjs/mongoose';
import type { ShieldType } from '../../../domain/value-objets/shield-type.vo';

@Schema({ _id: false })
export class ActorRoundShield {
  @Prop({ type: String, required: true })
  public readonly type: ShieldType;

  @Prop({ required: true })
  public readonly shieldDb: number;

  @Prop({ required: true })
  public readonly maxBlocks: number;

  @Prop({ required: true })
  public readonly currentBlocks: number;
}
