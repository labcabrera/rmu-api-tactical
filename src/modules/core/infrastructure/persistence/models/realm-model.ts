import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Realm } from 'src/modules/core/domain/entities/realm';

export type RealmDocument = Realm & Document;

@Schema({ collection: 'realms', versionKey: false })
export class RealmModel {
  @Prop({ required: true })
  _id: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: false })
  description?: string;

  @Prop({ required: true })
  owner: string;

  @Prop({ required: true })
  createdAt: Date;

  @Prop({ required: false })
  updatedAt?: Date;
}

export const RealmSchema = SchemaFactory.createForClass(RealmModel);
