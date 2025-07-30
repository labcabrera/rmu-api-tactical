import mongoose, { Schema } from 'mongoose';
import { TacticalGameModel } from '../types';

const TacticalGameSchema: Schema<TacticalGameModel> = new Schema({
    name: {
        type: String,
        required: true
    },
    user: {
        type: String,
        required: true
    },
    status: {
        type: String,
        required: false
    },
    round: {
        type: Number,
        required: true
    },
    phase: {
        type: String,
        required: false
    },
    factions: [String],
    description: {
        type: String,
        required: false
    }
}, {
    timestamps: true,
    collection: "tactical-games"
});

const TacticalGameModel = mongoose.model<TacticalGameModel>('TacticalGame', TacticalGameSchema);

export default TacticalGameModel;
