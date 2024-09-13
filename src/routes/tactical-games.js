const express = require('express');
const { MongoClient } = require('mongodb');
const router = express.Router();
const TacticalGame = require("../models/tactical-game")

router.get('/', async (req, res) => {
    try {
        const games = await TacticalGame.find();
        res.json(games);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.get('/:id', (req, res) => {
    const gameId = parseInt(req.params.id);
    const game = games.find((u) => u.id === gameId);
    if (!user) {
        return res.status(404).json({ message: 'Tactical game not found' });
    }
    res.json(user);
});

router.post('/', async (req, res) => {
    console.log("Tactical game creation << " + req.params.name);
    const { name, user, description } = req.body;
    try {
        const newGame = new TacticalGame({ name, user, description });
        newGame.status = 'created';
        const savedGame = await newGame.save();
        res.status(201).json(savedGame);
    } catch (error) {
        console.log(error);
        res.status(400).json({ message: error.message });
    }
});

router.put('/:id', async (req, res) => {
    console.log("Tactical game update << " + req.params.id);
    try {
        const updatedGame = await TacticalGame.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updatedGame) {
            return res.status(404).json({ message: 'Tactical game not found' });
        }
        res.json(updatedItem);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

router.delete('/:id', async (req, res) => {
    console.log("Tactical game delete << " + req.params.id);
    try {
        const id = req.params.id;
        const deletedGame = await TacticalGame.findByIdAndDelete(id);
        if (!deletedGame) return res.status(404).json({ message: 'Tactical game not found' });
        res.json({ message: 'Deleted tactical game ' + id });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;