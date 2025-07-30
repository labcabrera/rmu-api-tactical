import mongoose, { Schema } from 'mongoose';
import { TacticalCharacterRoundModel } from '../types';

const tacticalCharacterRoundSchema: Schema<TacticalCharacterRoundModel> = new mongoose.Schema({
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

const TacticalCharacterRoundDocument = mongoose.model<TacticalCharacterRoundModel>('TacticalCharacterRound', tacticalCharacterRoundSchema);

export default TacticalCharacterRoundDocument;
