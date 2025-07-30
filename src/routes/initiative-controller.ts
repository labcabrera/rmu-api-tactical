import express, { Request, Response, Router } from 'express';
const router: Router = express.Router();

import errorService from "../services/error-service";
import initiativeService from "../services/initiative-service";

router.post('/:characterRoundId/roll/:initiativeRoll', async (req: Request, res: Response) => {
    try {
        const characterRoundId: string = req.params.characterRoundId!;
        const initiativeRoll: number = parseInt(req.params.initiativeRoll!);
        const result = await initiativeService.updateInitiative(characterRoundId, initiativeRoll);
        res.json(result);
    } catch (error) {
        errorService.sendErrorResponse(res, error as Error);
    }
});

export default router;
