import mongoose, { Schema } from 'mongoose';
import { TacticalCharacterRoundDocument } from '../types';

const tacticalCharacterRoundSchema: Schema<TacticalCharacterRoundDocument> = new mongoose.Schema({
    gameId: {
        type: String,
        required: true
    },
    tacticalCharacterId: {
        type: String,
        required: true
    },
    round: {
        type: Number,
        required: true
    },
    initiative: {
        type: Schema.Types.Mixed,
        required: false
    },
    actionPoints: {
        type: Number,
        required: false
    }
}, {
    timestamps: true,
    collection: "tactical-character-rounds"
});

const TacticalCharacterRoundDocument = mongoose.model<TacticalCharacterRoundDocument>('TacticalCharacterRound', tacticalCharacterRoundSchema);

export default TacticalCharacterRoundDocument;
