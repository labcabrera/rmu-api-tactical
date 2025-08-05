import mongoose, { Schema } from "mongoose";
import { ActionDocument } from "../mongo-types";

const ActionSchema: Schema<ActionDocument> = new Schema(
  {
    gameId: {
      type: String,
      required: true,
    },
    characterId: {
      type: String,
      required: true,
    },
    round: {
      type: Number,
      required: true,
    },
    actionType: {
      type: String,
      required: true,
    },
    phaseStart: {
      type: Number,
      required: true,
    },
    actionPoints: {
      type: Number,
      required: true,
    },
    attackInfo: {
      type: Schema.Types.Mixed,
      required: false,
    },
    attacks: [
      {
        type: Schema.Types.Mixed,
        required: false,
      },
    ],
    description: {
      type: String,
      required: false,
    },
    result: {
      type: Schema.Types.Mixed,
      required: false,
    },
  },
  {
    timestamps: true,
    collection: "tactical-actions",
  },
);

const ActionDocument = mongoose.model<ActionDocument>("Action", ActionSchema);

export default ActionDocument;
