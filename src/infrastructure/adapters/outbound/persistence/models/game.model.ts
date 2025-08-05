import mongoose, { Schema } from "mongoose";
import { TacticalGameDocument } from "../mongo-types";

const TacticalGameSchema: Schema<TacticalGameDocument> = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    user: {
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
  },
  {
    timestamps: true,
    collection: "tactical-games",
  },
);

const TacticalGameModel = mongoose.model<TacticalGameDocument>(
  "TacticalGame",
  TacticalGameSchema,
);

export default TacticalGameModel;
