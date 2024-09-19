const express = require('express');
const router = express.Router();

const TacticalGame = require("../models/tactical-game-model")

const tacticalGameService = require("../services/tactical-game-service");

router.get('/', async (req, res) => {
    try {
        const page = req.query.page ? parseInt(req.query.page) : 0;
        const size = req.query.size ? parseInt(req.query.size) : 10;
        const response = await tacticalGameService.findAll(page, size);
        res.json(response);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.get('/:gameId', async (req, res) => {
    try {
        const gameId = req.params.gameId;
        const readedGame = await tacticalGameService.findById(gameId);
        res.json(readedGame);
    } catch (error) {
        res.status(error.status ? error.status : 500).json({ message: error.message });
    }
});

router.post('/', async (req, res) => {
    try {
        console.log("Tactical game creation << " + req.body.name);
        //TODO JWT
        const user = "lab.cabrera@gmail.com";
        const newGame = await tacticalGameService.insert(user, req.body);
        res.status(201).json(newGame);
    } catch (error) {
        console.log(error);
        res.status(400).json({ message: error.message });
    }
});

router.patch('/:id', async (req, res) => {
    try {
        console.log("Tactical game update << " + req.params.id);
        const gameId = req.params.gameId;
        const result = await tacticalGameService.update(gameId, req.body);
        res.json(result);
    } catch (error) {
        res.status(error.status ? error.status : 500).json({ message: error.message });
    }
});

router.delete('/:gameId', async (req, res) => {
    try {
        console.log("Tactical game delete << " + req.params.gameId);
        const gameId = req.params.gameId;
        await tacticalGameService.deleteById(gameId);
        res.status(204).send();
    } catch (error) {
        res.status(error.status ? error.status : 500).json({ message: error.message });
    }
});

module.exports = router;