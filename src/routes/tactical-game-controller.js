const express = require('express');
const router = express.Router();

const tacticalGameService = require("../services/tactical-game-service");
const tacticalGameRoundService = require("../services/tactical-game-round-service");
const errorService = require("../services/error-service");

router.get('/', async (req, res) => {
    try {
        const searchExpression = req.query.search;
        const username = req.query.username;
        const page = req.query.page ? parseInt(req.query.page) : 0;
        const size = req.query.size ? parseInt(req.query.size) : 10;
        const response = await tacticalGameService.find(searchExpression, username, page, size);
        res.json(response);
    } catch (error) {
        errorService.sendErrorResponse(error);
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

router.patch('/:gameId', async (req, res) => {
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

router.get('/:tacticalGameId/rounds/:round/characters', async (req, res) => {
    try {
        const tacticalGameId = req.params.tacticalGameId;
        const round = parseInt(req.params.round);
        const result = await tacticalGameRoundService.findTacticalCharacterRounds(tacticalGameId, round);
        res.json(result);
    } catch (error) {
        errorService.sendErrorResponse(error);
    }
});

router.post('/:tacticalGameId/rounds/start', async (req, res) => {
    try {
        const tacticalGameId = req.params.tacticalGameId;
        console.log("Tactical game round start << " + tacticalGameId);
        const result = await tacticalGameRoundService.startRound(tacticalGameId);
        res.status(200).json(result);
    } catch (error) {
        console.log(error);
        res.status(400).json({ message: error.message });
    }
});

module.exports = router;