import mongoose, { Schema } from 'mongoose';
import { ITacticalCharacterRound } from '../types';

const tacticalCharacterRoundSchema: Schema<ITacticalCharacterRound> = new mongoose.Schema({
    tacticalGameId: {
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

const TacticalCharacterRound = mongoose.model<ITacticalCharacterRound>('TacticalCharacterRound', tacticalCharacterRoundSchema);

export default TacticalCharacterRound;
