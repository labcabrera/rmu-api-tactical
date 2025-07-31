import mongoose, { Schema } from 'mongoose';
import { TacticalActionDocument } from '../mongo-types';

const tacticalActionSchema: Schema<TacticalActionDocument> = new Schema({
    gameId: {
        type: String,
        required: true
    },
    characterId: {
        type: String,
        required: true
    },
    round: {
        type: Number,
        required: true
    },
    type: {
        type: String,
        required: true
    },
    phaseStart: {
        type: String,
        required: true
    },
    actionPoints: {
        type: Number,
        required: true
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

const TacticalActionDocument = mongoose.model<TacticalActionDocument>('TacticalAction', tacticalActionSchema);

export default TacticalActionDocument;
