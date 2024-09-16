const express = require('express');
const router = express.Router();
const TacticalGame = require("../models/tactical-game")

router.get('/', async (req, res) => {
    try {
        const page = req.query.page ? parseInt(req.query.page) : 0;
        const size = req.query.size ? parseInt(req.query.size) : 10;
        const skip = page * size;
        const games = await TacticalGame.find().skip(skip).limit(size).sort({ updatedAt: -1 });
        const count = await TacticalGame.countDocuments();
        res.json({ content: games, pagination: { page: page, size: size, totalElements: count } });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.get('/:gameId', async (req, res) => {
    try {
        const gameId = req.params.gameId;
        const readedGame = await TacticalGame.findById(gameId);
        if (!readedGame) {
            return res.status(404).json({ message: 'Tactical game not found' });
        }
        res.json(readedGame);
    } catch (error) {
        res.status(500).json({ message: error.message, stack: error.stack });
    }
});

router.post('/', async (req, res) => {
    try {
        console.log("Tactical game creation << " + req.body.name);
        const { name, user, description } = req.body;
        const newGame = new TacticalGame({ name, user, description });
        newGame.status = 'created';
        const savedGame = await newGame.save();
        res.status(201).json(savedGame);
    } catch (error) {
        console.log(error);
        res.status(400).json({ message: error.message });
    }
});

router.patch('/:id', async (req, res) => {
    try {
        console.log("Tactical game update << " + req.params.id);
        const { name, description } = req.body;
        const updatedGame = await TacticalGame.findByIdAndUpdate(req.params.id, { name, description }, { new: true });
        if (!updatedGame) {
            return res.status(404).json({ message: 'Tactical game not found' });
        }
        res.json(updatedGame);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

router.delete('/:gameId', async (req, res) => {
    try {
        console.log("Tactical game delete << " + req.params.gameId);
        const gameId = req.params.gameId;
        const deletedGame = await TacticalGame.findByIdAndDelete(gameId);
        if (!deletedGame) {
            return res.status(404).json({ message: 'Tactical game not found' });
        }
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;