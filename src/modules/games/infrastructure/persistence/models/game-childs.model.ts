import { Prop, Schema } from '@nestjs/mongoose';
import { ActorRoundFaction } from '../../../../actor-rounds/domain/value-objects/actor-round-faction.vo.js';
import type { ActorType } from '../../../domain/value-objects/actor-type.vo.js';

@Schema({ _id: false })
export class Actor {
  @Prop({ required: true })
  id: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  faction: ActorRoundFaction;

  @Prop({ type: String, required: true })
  type: ActorType;

  @Prop({ required: true })
  owner: string;

  /** Spec 055: the NPC an NPC actor is a specimen of. */
  @Prop({ type: String, required: false })
  npcId?: string;
}

@Schema({ _id: false })
export class GameEnvironment {
  @Prop({ required: false })
  temperatureFatigueModifier?: number;

  @Prop({ required: false })
  altitudeFatigueModifier?: number;
}
