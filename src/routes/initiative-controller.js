const express = require('express');
const router = express.Router();

const initiativeService = require("../services/initiative-service");
const errorService = require("../services/error-service");

router.post('/:characterRoundId/roll/:initiativeRoll', async (req, res) => {
    try {
        const characterRoundId = req.params.characterRoundId;
        const initiativeRoll = req.params.initiativeRoll;
        const result = await initiativeService.updateInitiative(characterRoundId, initiativeRoll);
        res.json(result);
    } catch (error) {
        errorService.sendErrorResponse(res, error);
    }
});

module.exports = router;