import mongoose, { Schema } from 'mongoose';
import { ITacticalCharacter } from '../types';

const tacticalCharacterSchema: Schema<ITacticalCharacter> = new mongoose.Schema({
    gameId: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    faction: {
        type: String,
        required: false
    },
    hitPoints: {
        type: Number,
        required: false
    },
    maxHitPoints: {
        type: Number,
        required: false
    },
    initiative: {
        type: Number,
        required: false
    },
    status: {
        type: String,
        required: false
    },
    position: {
        x: { type: Number, required: false },
        y: { type: Number, required: false },
        z: { type: Number, required: false }
    },
    skills: [{
        name: { type: String, required: true },
        value: { type: Number, required: true },
        modifier: { type: Number, required: false }
    }],
    equipment: [{
        name: { type: String, required: true },
        type: { type: String, required: true },
        equipped: { type: Boolean, required: true },
        properties: { type: Schema.Types.Mixed, required: false }
    }]
}, {
    timestamps: true,
    collection: "tactical-characters"
});

const TacticalCharacter = mongoose.model<ITacticalCharacter>('TacticalCharacter', tacticalCharacterSchema);

export default TacticalCharacter;
