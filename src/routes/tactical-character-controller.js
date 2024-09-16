const express = require('express');
const { MongoClient } = require('mongodb');
const router = express.Router();
const TacticalCharacter = require("../models/tactical-character-model")
const TacticalGame = require("../models/tactical-game-model")

router.get('/:characterId', async (req, res) => {
    try {
        const characterId = req.params.characterId;
        const readedCharacter = await TacticalCharacter.findById(characterId);
        if (!readedCharacter) {
            return res.status(404).json({ message: "Tactical character not found" });
        }
        res.json(readedCharacter);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.post('/:characterId/management/effects', async (req, res) => {
    try {
        const characterId = req.params.characterId;
        const { type, value, rounds } = req.body;
        const effects = { type: type, value: value, rounds: rounds };
        const updatedCharacter = await TacticalCharacter.findByIdAndUpdate(
            characterId,
            { $push: { effects: effects } },
            { new: true });
        if (!updatedCharacter) {
            return res.status(404).json({ message: 'Tactical character not found' });
        }
        res.json(updatedCharacter);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.delete('/:characterId', async (req, res) => {
    try {
        console.log("Tactical character delete << " + req.params.characterId);
        const characterId = req.params.characterId;
        const deletedCharacter = await TacticalCharacter.findByIdAndDelete(characterId);
        if (!deletedCharacter) {
            return res.status(404).json({ message: 'Tactical character not found' });
        }
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.get('/tactical-games/:gameId', async (req, res) => {
    try {
        const gameId = req.params.gameId;
        const page = req.query.page ? parseInt(req.query.page) : 0;
        const size = req.query.size ? parseInt(req.query.size) : 10;
        const skip = page * size;
        const readedCharacters = await TacticalCharacter.find({ tacticalGameId: gameId }).skip(skip).limit(size).sort({ updatedAt: -1 });
        const count = await TacticalCharacter.countDocuments({ tacticalGameId: gameId });
        res.json({ content: readedCharacters, pagination: { page: page, size: size, totalElements: count } });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.post('/tactical-games/:gameId', async (req, res) => {
    try {
        const gameId = req.params.gameId;
        const game = await TacticalGame.findById(gameId);
        if (!game) {
            res.status(404).json({ message: "Tactical game not found" });
        }
        const { name, level, race, size, armorType, hp, skills, items, equipment, description } = req.body;
        const newCharacter = new TacticalCharacter({ name, level, race, size, armorType, hp, skills, items, equipment, description });
        newCharacter.tacticalGameId = gameId;
        const savedCharacter = await newCharacter.save();
        res.status(201).json(savedCharacter);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;