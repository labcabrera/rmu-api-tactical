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
  override findByRsql(rsql: string | undefined, page: number, size: number, filter?: Record<string, unknown>): Promise<Page<Action>> {
    return super.findByRsql(rsql, page, size, filter, { createdAt: 1, _id: 1 });
  }

  async deleteByGameId(gameId: string): Promise<void> {
    await this.model.deleteMany({ gameId });
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
      retroactive: doc.retroactive ?? false,
      spell: doc.spell ?? null,
      parryExclusions: doc.parryExclusions ?? null,
      medical: doc.medical ?? null,
      useItem: doc.useItem ?? null,
      reaction: doc.reaction
        ? { ...doc.reaction, obOverride: doc.reaction.obOverride ?? null, alertId: doc.reaction.alertId ?? null }
        : null,
      drawAndLoad: doc.drawAndLoad ? { itemId: doc.drawAndLoad.itemId ?? null } : null,
      aim: doc.aim ? { targetActorId: doc.aim.targetActorId, itemId: doc.aim.itemId } : null,
      otherAction: doc.otherAction
        ? { kind: doc.otherAction.kind, attackName: doc.otherAction.attackName ?? null, ap: doc.otherAction.ap }
        : null,
      strayShot: doc.strayShot ? { ...doc.strayShot } : null,
      owner: doc.owner,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }
}
