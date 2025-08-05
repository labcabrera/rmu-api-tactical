import mongoose, { Schema } from 'mongoose';
import { CharacterRoundDocument } from '../mongo-types';

const CharacterRoundSchema: Schema<CharacterRoundDocument> = new mongoose.Schema(
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
    initiative: {
      type: Schema.Types.Mixed,
      required: false,
    },
    actionPoints: {
      type: Number,
      required: false,
    },
  },
  {
    timestamps: true,
    collection: 'tactical-character-rounds',
  }
);

const CharacterRoundDocument = mongoose.model<CharacterRoundDocument>('TacticalCharacterRound', CharacterRoundSchema);

export default CharacterRoundDocument;
