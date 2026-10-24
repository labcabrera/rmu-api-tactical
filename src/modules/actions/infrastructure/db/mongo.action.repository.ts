import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Page } from '../../../shared/application/pagination/page.js';
import { NotFoundError } from '../../../shared/domain/errors/errors.js';
import { RsqlParser } from '../../../shared/infrastructure/db/rsql-parser.js';
import type { ActionRepository } from '../../application/ports/action-repository.port.js';
import { Action } from '../../domain/aggregates/action.js';
import { ActionResolution } from '../../domain/value-objects/action-resolution.vo.js';
import { type ActionDocument, ActionModel } from '../persistence/models/action.model.js';

@Injectable()
export class MongoActionRepository implements ActionRepository {
  constructor(
    @InjectModel(ActionModel.name) private actionModel: Model<ActionDocument>,
    private rsqlParser: RsqlParser,
  ) {}

  async findById(id: string): Promise<Action | null> {
    return this.actionModel.findById(id).then(readed => (readed ? this.mapToEntity(readed) : null));
  }

  async findByRsql(rsql: string, page: number, size: number): Promise<Page<Action>> {
    const skip = page * size;
    const mongoQuery = this.rsqlParser.parse(rsql);
    const [actionsDocs, totalElements] = await Promise.all([
      this.actionModel.find(mongoQuery).skip(skip).limit(size).sort({ name: 1 }),
      this.actionModel.countDocuments(mongoQuery),
    ]);
    const content = actionsDocs.map(doc => this.mapToEntity(doc));
    return new Page<Action>(content, page, size, totalElements);
  }

  async save(request: Partial<Action>): Promise<Action> {
    const model = new this.actionModel({ ...request, _id: request.id });
    return model.save().then(saved => this.mapToEntity(saved));
  }

  async update(id: string, request: Partial<Action>): Promise<Action> {
    const current = await this.actionModel.findById(id);
    if (!current) {
      throw new NotFoundError('Action', id);
    }
    //TODO merge
    const update = request;
    const updatedAction = await this.actionModel.findByIdAndUpdate(id, { $set: update }, { new: true });
    if (!updatedAction) {
      throw new NotFoundError('Action', id);
    }
    return this.mapToEntity(updatedAction);
  }

  async deleteById(id: string): Promise<Action | null> {
    const result = await this.actionModel.findByIdAndDelete(id);
    return result ? this.mapToEntity(result) : null;
  }

  async deleteByGameId(gameId: string): Promise<void> {
    await this.actionModel.deleteMany({ gameId });
  }
  async deleteByCharacterId(characterId: string): Promise<void> {
    await this.actionModel.deleteMany({ characterId });
  }

  private mapToEntity(doc: ActionDocument): Action {
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
