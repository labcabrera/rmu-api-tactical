import mongoose, { Schema } from 'mongoose';
import { TacticalActionModel } from '../types';

const tacticalActionSchema: Schema<TacticalActionModel> = new mongoose.Schema({
    tacticalGameId: {
        type: String,
        required: false
    },
    tacticalCharacterId: {
        type: String,
        required: false
    },
    characterId: {
        type: String,
        required: false
    },
    round: {
        type: Number,
        required: true
    },
    type: {
        type: String,
        required: false
    },
    phaseStart: {
        type: String,
        required: false
    },
    actionPoints: {
        type: Number,
        required: false
    },
    attackInfo: {
        type: Schema.Types.Mixed,
        required: false
    },
    attacks: [{
        type: Schema.Types.Mixed,
        required: false
    }],
    description: {
        type: String,
        required: false
    },
    result: {
        type: Schema.Types.Mixed,
        required: false
    }
}, {
    timestamps: true,
    collection: "tactical-actions"
});

const TacticalActionDocument = mongoose.model<TacticalActionModel>('TacticalAction', tacticalActionSchema);

export default TacticalActionDocument;
