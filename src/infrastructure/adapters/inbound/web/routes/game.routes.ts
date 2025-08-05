import { Router } from 'express';

import { createAuthMiddleware, requireRoles } from '@infrastructure/adapters/inbound/web/security/auth.middleware';
import { container } from '@shared/container';
import { TYPES } from '../../../../../shared/types';
import { asyncHandler } from '../async-handler';
import { GameController } from '../controllers/game.controller';

const router = Router();
const gameController = container.get<GameController>(TYPES.GameController);

const authMiddleware = createAuthMiddleware();

router.get(
  '/',
  authMiddleware,
  asyncHandler(async (req, res, next) => {
    await gameController.find(req, res, next);
  })
);

router.get(
  '/:id',
  authMiddleware,
  asyncHandler(async (req, res, next) => {
    await gameController.findById(req, res, next);
  })
);

router.post(
  '/',
  authMiddleware,
  requireRoles(['tactical-user']),
  asyncHandler(async (req, res, next) => {
    await gameController.create(req, res, next);
  })
);

router.patch(
  '/:id',
  authMiddleware,
  requireRoles(['tactical-user']),
  asyncHandler(async (req, res, next) => {
    await gameController.update(req, res, next);
  })
);

router.delete(
  '/:id',
  authMiddleware,
  requireRoles(['tactical-user']),
  asyncHandler(async (req, res, next) => {
    await gameController.deleteById(req, res, next);
  })
);

router.post(
  '/:id/rounds/start',
  authMiddleware,
  requireRoles(['tactical-user']),
  asyncHandler(async (req, res, next) => {
    await gameController.startRound(req, res, next);
  })
);

export { router as gameRouter };
