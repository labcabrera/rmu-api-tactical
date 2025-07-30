const express = require('express');
const router = express.Router();

const attackService = require("../services/attack/attack-service");
const errorService = require("../services/error-service");

router.post('/:actionId/roll', async (req, res) => {
    try {
        const actionId = req.params.actionId;
        const result = await attackService.updateAttackRoll(actionId, req.body);
        res.json(result);
    } catch (error) {
        errorService.sendErrorResponse(res, error);
    }
});

module.exports = router;