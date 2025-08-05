import { inject, injectable } from 'inversify';

import { Action } from '@domain/entities/action.entity';
import { Logger } from '@domain/ports/logger';
import { ActionRepository } from '@domain/ports/outbound/action.repository';

import { TYPES } from '@shared/types';
import { NotFoundError } from '../../../domain/errors/errors';

@injectable()
export class FindActionByIdUseCase {
  constructor(
    @inject(TYPES.ActionRepository)
    private readonly actionRepository: ActionRepository,
    @inject(TYPES.Logger) private readonly logger: Logger
  ) {}

  async execute(actionId: string): Promise<Action> {
    this.logger.info(`FindActionByIdUseCase: Finding action << ${actionId}`);
    const action = await this.actionRepository.findById(actionId);
    if (!action) {
      throw new NotFoundError('Action', actionId);
    }
    return action;
  }
}
