import express, { Request, Response, Router } from 'express';
const router: Router = express.Router();

import attackService from "../services/attack/attack-service";
import errorService from "../services/error-service";

router.post('/:actionId/roll', async (req: Request, res: Response) => {
    try {
        const actionId: string = req.params.actionId!;
        const result = await attackService.updateAttackRoll(actionId, req.body);
        res.json(result);
    } catch (error) {
        errorService.sendErrorResponse(res, error as Error);
    }
});

export default router;
