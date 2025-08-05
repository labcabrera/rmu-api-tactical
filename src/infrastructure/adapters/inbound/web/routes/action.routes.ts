import { Router } from 'express';

import {
  createAuthMiddleware,
  requireRoles,
} from '@infrastructure/adapters/inbound/web/security/auth.middleware';
import { container } from '@shared/container';
import { asyncHandler } from '../async-handler';
import { ActionController } from '../controllers/action.controller';

const router = Router();
const actionController = container.get<ActionController>('ActionController');

const authMiddleware = createAuthMiddleware();

router.get(
  '/',
  authMiddleware,
  asyncHandler(async (req, res, next) => {
    await actionController.findActions(req, res, next);
  })
);

router.get(
  '/:id',
  authMiddleware,
  asyncHandler(async (req, res, next) => {
    await actionController.findById(req, res, next);
  })
);

router.post(
  '/',
  authMiddleware,
  requireRoles(['admin']),
  asyncHandler(async (req, res, next) => {
    await actionController.create(req, res, next);
  })
);

router.delete(
  '/:id',
  authMiddleware,
  requireRoles(['admin']),
  asyncHandler(async (req, res, next) => {
    await actionController.deleteById(req, res, next);
  })
);

export { router as raceRouter };
