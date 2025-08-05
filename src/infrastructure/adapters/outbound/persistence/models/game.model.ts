import mongoose, { Schema } from 'mongoose';

export interface TacticalGameDocument extends Document {
  name: string;
  status: string;
  round: number;
  phase: string;
  factions: string[];
  description?: string;
  owner: string;
  createdAt: Date;
  updatedAt?: Date;
}

const TacticalGameSchema: Schema<TacticalGameDocument> = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      required: false,
    },
    round: {
      type: Number,
      required: true,
    },
    phase: {
      type: String,
      required: false,
    },
    factions: [String],
    description: {
      type: String,
      required: false,
    },
    owner: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      required: true,
    },
    updatedAt: {
      type: Date,
      required: false,
    }
  },
  {
    collection: 'tactical-games',
  }
);

const TacticalGameModel = mongoose.model<TacticalGameDocument>('TacticalGame', TacticalGameSchema);

export default TacticalGameModel;
