import { Prop, Schema } from '@nestjs/mongoose';
import { ActorRoundFaction } from '../../../../actor-rounds/domain/value-objets/actor-round-faction.vo';
import type { ActorType } from '../../../domain/value-objects/actor-type.vo';

@Schema({ _id: false })
export class Actor {
  @Prop({ required: true })
  id: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  faction: ActorRoundFaction;

  @Prop({ required: true })
  type: ActorType;

  @Prop({ required: true })
  owner: string;
}

@Schema({ _id: false })
export class GameEnvironment {
  @Prop({ required: false })
  temperatureFatigueModifier?: number;

  @Prop({ required: false })
  altitudeFatigueModifier?: number;
}
