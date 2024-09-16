const express = require('express');
const { MongoClient } = require('mongodb');
const router = express.Router();
const TacticalCharacter = require("../models/tactical-character")
const TacticalGame = require("../models/tactical-game")

router.get('/:characterId', async (req, res) => {
    try {
        const characterId = req.params.gameId;
        const readedCharacter = await TacticalCharacter.findById(characterId);
        if (!readedCharacter) {
            res.status(404).json({ message: "Tactical character not found" });
        } else {
            res.json(readedCharacter);
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.get('/tactical-game/:gameId', async (req, res) => {
    try {
        const gameId = req.params.gameId;
        const games = await TacticalCharacter.find({ tacticalGameId: gameId });
        res.json(games);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.post('/tactical-game/:gameId', async (req, res) => {
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