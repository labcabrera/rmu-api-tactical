const express = require('express');
const router = express.Router();

const TacticalCharacter = require("../models/tactical-character-model");
const tacticalCharacterService = require("../services/tactical-character-service");
const itemService = require("../services/items/item-service");
const itemEquipService = require("../services/items/item-equip-service");
const tacticalCharacterSkillService = require("../services/tactical-character-skill-service");
const tacticalCharacterUpdateService = require('../services/tactical-character-update-service');

router.get('/', async (req, res) => {
    try {
        const searchExpression = req.query.search;
        const tacticalGameId = req.query.tacticalGameId;
        const page = req.query.page ? parseInt(req.query.page) : 0;
        const size = req.query.size ? parseInt(req.query.size) : 10;
        const response = await tacticalCharacterService.find(searchExpression, tacticalGameId, page, size);
        res.json(response);
    } catch (error) {
        sendErrorResponse(res, error);
    }
});

router.get('/:characterId', async (req, res) => {
    try {
        const characterId = req.params.characterId;
        const readedCharacter = await tacticalCharacterService.findById(characterId);
        if (!readedCharacter) {
            return res.status(404).json({ message: "Tactical character not found" });
        }
        res.json(readedCharacter);
    } catch (error) {
        sendErrorResponse(res, error);
    }
});

router.post('/', async (req, res) => {
    try {
        //TODO read from JWT
        const user = "lab.cabrera@gmail.com";
        const savedCharacter = await tacticalCharacterService.insert(user, req.body);
        res.status(201).json(savedCharacter);
    } catch (error) {
        sendErrorResponse(res, error);
    }
});

router.patch('/:characterId', async (req, res) => {
    try {
        const characterId = req.params.characterId;
        const updatedCharacter = await tacticalCharacterUpdateService.update(characterId, req.body);
        res.status(200).json(updatedCharacter);
    } catch (error) {
        sendErrorResponse(res, error);
    }
});

router.post('/:characterId/skills', async (req, res) => {
    try {
        const characterId = req.params.characterId;
        const savedCharacter = await tacticalCharacterSkillService.addSkill(characterId, req.body);
        res.status(200).json(savedCharacter);
    } catch (error) {
        sendErrorResponse(res, error);
    }
});

router.patch('/:characterId/skills/:skillId', async (req, res) => {
    try {
        const characterId = req.params.characterId;
        const skillId = req.params.skillId;
        const savedCharacter = await tacticalCharacterSkillService.updateSkill(characterId, skillId, req.body);
        res.status(200).json(savedCharacter);
    } catch (error) {
        sendErrorResponse(res, error);
    }
});

router.delete('/:characterId/skills/:itemId', async (req, res) => {
    try {
        const characterId = req.params.characterId;
        const skillId = req.params.itemId;
        const savedCharacter = await tacticalCharacterSkillService.deleteSkill(characterId, skillId);
        res.status(200).json(savedCharacter);
    } catch (error) {
        sendErrorResponse(res, error);
    }
});

router.post('/:characterId/items', async (req, res) => {
    try {
        const characterId = req.params.characterId;
        const savedCharacter = await itemService.addItem(characterId, req.body);
        res.status(200).json(savedCharacter);
    } catch (error) {
        sendErrorResponse(res, error);
    }
});

router.delete('/:characterId/items/:itemId', async (req, res) => {
    try {
        const characterId = req.params.characterId;
        const itemId = req.params.itemId;
        const savedCharacter = await itemService.deleteItem(characterId, itemId);
        res.status(200).json(savedCharacter);
    } catch (error) {
        sendErrorResponse(res, error);
    }
});

router.post('/:characterId/equipment', async (req, res) => {
    try {
        const characterId = req.params.characterId;
        const savedCharacter = await itemEquipService.equip(characterId, req.body);
        res.status(200).json(savedCharacter);
    } catch (error) {
        sendErrorResponse(res, error);
    }
});

router.post('/:characterId/management/effects', async (req, res) => {
    try {
        const characterId = req.params.characterId;
        const updatedCharacter = await tacticalCharacterService.addCharacterEffect(characterId, req.body);
        if (!updatedCharacter) {
            return res.status(404).json({ message: 'Tactical character not found' });
        }
        res.json(updatedCharacter);
    } catch (error) {
        sendErrorResponse(res, error);
    }
});

router.delete('/:characterId/management/effects/:effectId', async (req, res) => {
    try {
        const characterId = req.params.characterId;
        const effectId = req.params.effectId;
        const updatedCharacter = tacticalCharacterService.deleteCharacterEffect(characterId, effectId);
        res.status(204).send();
    } catch (error) {
        sendErrorResponse(res, error);
    }
});

router.post('/:characterId/management/hp/:hp', async (req, res) => {
    try {
        const characterId = req.params.characterId;
        const hp = parseInt(req.params.hp);
        const updatedCharacter = await tacticalCharacterService.setCurrentHp(characterId, hp);
        res.json(updatedCharacter);
    } catch (error) {
        sendErrorResponse(res, error);
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
        sendErrorResponse(res, error);
    }
});

router.get('/tactical-games/:gameId', async (req, res) => {
    try {
        const gameId = req.params.gameId;
        const page = req.query.page ? parseInt(req.query.page) : 0;
        const size = req.query.size ? parseInt(req.query.size) : 10;
        const response = await tacticalCharacterService.findCharactersByGameId(gameId, page, size);
        res.json(response);
    } catch (error) {
        sendErrorResponse(res, error);
    }
});

const sendErrorResponse = (res, error) => {
    res.status(error.status ? error.status : 500).json({
        code: error.status ? error.status.toString() : "500",
        message: error.message,
        timestamp: new Date().toISOString()
    });
};

module.exports = router;