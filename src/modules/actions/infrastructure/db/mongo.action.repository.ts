import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Page } from '../../../shared/application/pagination/page.js';
import { MongoBaseRepository } from '../../../shared/infrastructure/db/mongo.base.repository.js';
import { RsqlParser } from '../../../shared/infrastructure/db/rsql-parser.js';
import type { ActionRepository } from '../../application/ports/action-repository.port.js';
import { Action } from '../../domain/aggregates/action.js';
import { ActionResolution } from '../../domain/value-objects/action-resolution.vo.js';
import { type ActionDocument, ActionModel } from '../persistence/models/action.model.js';

@Injectable()
export class MongoActionRepository extends MongoBaseRepository<Action, ActionModel> implements ActionRepository {
  constructor(@InjectModel(ActionModel.name) actionModel: Model<ActionModel>, rsqlParser: RsqlParser) {
    super(actionModel, rsqlParser);
  }

  // Actions were listed sorted by a `name` they do not have, which left them in the order Mongo returns them (the
  // order they were stored). The creation date keeps that order on purpose.
  override findByRsql(rsql: string | undefined, page: number, size: number): Promise<Page<Action>> {
    return super.findByRsql(rsql, page, size, undefined, { createdAt: 1, _id: 1 });
  }

  async deleteByGameId(gameId: string): Promise<void> {
    await this.model.deleteMany({ gameId });
  }
  async deleteByCharacterId(characterId: string): Promise<void> {
    await this.model.deleteMany({ characterId });
  }

  protected mapToEntity(doc: ActionDocument): Action {
    return Action.fromProps({
      id: doc._id,
      gameId: doc.gameId,
      actorId: doc.actorId,
      round: doc.round,
      actionType: doc.actionType,
      freeAction: doc.freeAction,
      phaseStart: doc.phaseStart,
      phaseEnd: doc.phaseEnd,
      status: doc.status,
      actionPoints: doc.actionPoints,
      movement: doc.movement,
      attacks: doc.attacks,
      parries: doc.parries,
      maneuver: doc.maneuver,
      fatigue: doc.fatigue,
      description: doc.description,
      resolution: doc.resolution
        ? new ActionResolution(doc.resolution.mode, doc.resolution.reason, doc.resolution.apSource, doc.resolution.note)
        : null,
      apRange: doc.apRange ? { min: doc.apRange.min, max: doc.apRange.max } : null,
      continuesActionId: doc.continuesActionId ?? null,
      carriedAp: doc.carriedAp ?? null,
      owner: doc.owner,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }
}
