const express = require('express');
const router = express.Router();

const tacticalActionService = require("../services/tactical-action-service");
const errorService = require("../services/error-service");

router.get('/', async (req, res) => {
    try {
        const tacticalGameId = req.query.tacticalGameId;
        const tacticalCharacterId = req.query.tacticalCharacterId;
        const round = req.query.round;
        const page = req.query.page ? parseInt(req.query.page) : 0;
        const size = req.query.size ? parseInt(req.query.size) : 10;
        const response = await tacticalActionService.find(tacticalGameId, tacticalCharacterId, round, page, size);
        res.json(response);
    } catch (error) {
        errorService.sendErrorResponse(res, error);
    }
});

router.get('/:actionId', async (req, res) => {
    try {
        const actionId = req.params.actionId;
        const readedAction = await tacticalActionService.findById(actionId);
        res.json(readedAction);
    } catch (error) {
        errorService.sendErrorResponse(res, error);
    }
});

router.post('/', async (req, res) => {
    try {
        const newAction = await tacticalActionService.insert(req.body);
        res.status(201).json(newAction);
    } catch (error) {
        errorService.sendErrorResponse(res, error);
    }
});

router.patch('/:actionId', async (req, res) => {
    try {
        const actionId = req.params.actionId;
        const result = await tacticalActionService.update(actionId, req.body);
        res.json(result);
    } catch (error) {
        errorService.sendErrorResponse(res, error);
    }
});

router.delete('/:actionId', async (req, res) => {
    try {
        const actionId = req.params.actionId;
        await tacticalActionService.deleteById(actionId);
        res.status(204).send();
    } catch (error) {
        errorService.sendErrorResponse(res, error);
    }
});

module.exports = router;