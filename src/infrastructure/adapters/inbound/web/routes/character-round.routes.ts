import { Router } from 'express';

import { createAuthMiddleware } from '@infrastructure/adapters/inbound/web/security/auth.middleware';
import { container } from '@shared/container';
import { TYPES } from '@shared/types';
import { asyncHandler } from '../async-handler';
import { CharacterRoundController } from '../controllers/character-round.controller';

const router = Router();
const actionController = container.get<CharacterRoundController>(TYPES.CharacterRoundController);

const authMiddleware = createAuthMiddleware();

router.get(
  '/',
  authMiddleware,
  asyncHandler(async (req, res, next) => {
    await actionController.find(req, res, next);
  })
);

export { router as characterRoundRoutes };
