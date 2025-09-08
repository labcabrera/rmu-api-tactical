import { Prop, Schema } from '@nestjs/mongoose';
import * as actorTypeVo from '../../../domain/entities/actor-type.vo';

@Schema({ _id: false })
export class Actor {
  @Prop({ required: true })
  id: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  factionId: string;

  @Prop({ required: true })
  type: actorTypeVo.ActorType;

  @Prop({ required: true })
  owner: string;
}
