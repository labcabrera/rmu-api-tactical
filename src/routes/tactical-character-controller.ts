import express, { Request, Response, Router } from 'express';
const router: Router = express.Router();

import tacticalCharacterService from "../services/character-service";
import errorService from "../services/error-service";

interface CharacterQuery {
    search?: string;
    tacticalGameId?: string;
    page?: string;
    size?: string;
}

router.get('/', async (req: Request<{}, {}, {}, CharacterQuery>, res: Response) => {
    try {
        const searchExpression = req.query.search;
        const tacticalGameId = req.query.tacticalGameId;
        const page = req.query.page ? parseInt(req.query.page) : 0;
        const size = req.query.size ? parseInt(req.query.size) : 10;
        const response = await tacticalCharacterService.find(searchExpression, tacticalGameId, page, size);
        res.json(response);
    } catch (error) {
        errorService.sendErrorResponse(res, error as Error);
    }
});

router.get('/:characterId', async (req: Request, res: Response): Promise<void> => {
    try {
        const characterId: string = req.params.characterId!;
        const readedCharacter = await tacticalCharacterService.findById(characterId);
        if (!readedCharacter) {
            res.status(404).json({ message: "Tactical character not found" });
            return;
        }
        res.json(readedCharacter);
    } catch (error) {
        errorService.sendErrorResponse(res, error as Error);
    }
});

router.post('/', async (req: Request, res: Response) => {
    try {
        //TODO read from JWT
        const user: string = "lab.cabrera@gmail.com";
        const savedCharacter = await tacticalCharacterService.insert(user, req.body);
        res.status(201).json(savedCharacter);
    } catch (error) {
        errorService.sendErrorResponse(res, error as Error);
    }
});

router.patch('/:characterId', async (req: Request, res: Response) => {
    try {
        const characterId: string = req.params.characterId!;
        const updatedCharacter = await tacticalCharacterService.update(characterId, req.body);
        res.status(200).json(updatedCharacter);
    } catch (error) {
        errorService.sendErrorResponse(res, error as Error);
    }
});

router.delete('/:characterId', async (req: Request, res: Response) => {
    try {
        const characterId: string = req.params.characterId!;
        await tacticalCharacterService.deleteById(characterId);
        res.status(204).send();
    } catch (error) {
        errorService.sendErrorResponse(res, error as Error);
    }
});

export default router;
