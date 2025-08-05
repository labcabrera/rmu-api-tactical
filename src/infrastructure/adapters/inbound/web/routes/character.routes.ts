import { Router } from 'express';

import { createAuthMiddleware, requireRoles } from '@infrastructure/adapters/inbound/web/security/auth.middleware';
import { container } from '@shared/container';
import { TYPES } from '../../../../../shared/types';
import { asyncHandler } from '../async-handler';
import { CharacterController } from '../controllers/character.controller';

const router = Router();
const characterController = container.get<CharacterController>(TYPES.CharacterController);

const authMiddleware = createAuthMiddleware();

router.get(
  '/',
  authMiddleware,
  asyncHandler(async (req, res, next) => {
    await characterController.find(req, res, next);
  })
);

router.get(
  '/:id',
  authMiddleware,
  asyncHandler(async (req, res, next) => {
    await characterController.findById(req, res, next);
  })
);

router.post(
  '/',
  authMiddleware,
  requireRoles(['tactical-user']),
  asyncHandler(async (req, res, next) => {
    await characterController.create(req, res, next);
  })
);

router.patch(
  '/:id',
  authMiddleware,
  requireRoles(['tactical-user']),
  asyncHandler(async (req, res, next) => {
    await characterController.update(req, res, next);
  })
);

router.delete(
  '/:id',
  authMiddleware,
  requireRoles(['tactical-user']),
  asyncHandler(async (req, res, next) => {
    await characterController.deleteById(req, res, next);
  })
);

router.post(
  '/:id/items',
  authMiddleware,
  requireRoles(['tactical-user']),
  asyncHandler(async (req, res, next) => {
    await characterController.addItem(req, res, next);
  })
);

router.delete(
  '/:id/items/:itemId',
  authMiddleware,
  requireRoles(['tactical-user']),
  asyncHandler(async (req, res, next) => {
    await characterController.deleteItem(req, res, next);
  })
);

router.post(
  '/:id/equipment',
  authMiddleware,
  requireRoles(['tactical-user']),
  asyncHandler(async (req, res, next) => {
    await characterController.equipItem(req, res, next);
  })
);

router.post(
  '/:id/skills',
  authMiddleware,
  requireRoles(['tactical-user']),
  asyncHandler(async (req, res, next) => {
    await characterController.addSkill(req, res, next);
  })
);

router.patch(
  '/:id/skills/:skillId',
  authMiddleware,
  requireRoles(['tactical-user']),
  asyncHandler(async (req, res, next) => {
    await characterController.updateSkill(req, res, next);
  })
);

router.delete(
  '/:id/skills/:skillId',
  authMiddleware,
  requireRoles(['tactical-user']),
  asyncHandler(async (req, res, next) => {
    await characterController.deleteSkill(req, res, next);
  })
);

export { router as characterRouter };
