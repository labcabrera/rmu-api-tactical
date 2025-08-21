import { Prop, Schema } from '@nestjs/mongoose';
import * as ge from '../../../domain/entities/game.entity';

@Schema({ _id: false })
export class Actor {
  @Prop({ required: true })
  id: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  factionId: string;

  @Prop({ required: true })
  type: ge.ActorType;

  @Prop({ required: true })
  owner: string;
}
