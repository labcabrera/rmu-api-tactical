import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose/dist/common/mongoose.decorators';
import { Model } from 'mongoose';

import { Page } from '../../../../shared/domain/entities/page.entity';
import { NotFoundError } from '../../../../shared/domain/errors';
import { RsqlParser } from '../../../../shared/infrastructure/messaging/rsql-parser';
import { ActionRepository } from '../../../application/ports/out/action.repository';
import { Action } from '../../../domain/entities/action.entity';
import { ActionDocument, ActionModel } from '../models/action.model';

@Injectable()
export class MongoActionRepository implements ActionRepository {
  constructor(
    @InjectModel(ActionModel.name) private actionModel: Model<ActionDocument>,
    private rsqlParser: RsqlParser,
  ) {}

  async findById(id: string): Promise<Action | null> {
    const readed = await this.actionModel.findById(id);
    return readed ? this.mapToEntity(readed) : null;
  }

  async findByRsql(rsql: string, page: number, size: number): Promise<Page<Action>> {
    const skip = page * size;
    const mongoQuery = this.rsqlParser.parse(rsql);
    const [actionsDocs, totalElements] = await Promise.all([
      this.actionModel.find(mongoQuery).skip(skip).limit(size).sort({ name: 1 }),
      this.actionModel.countDocuments(mongoQuery),
    ]);
    const content = actionsDocs.map((doc) => this.mapToEntity(doc));
    return new Page<Action>(content, page, size, totalElements);
  }

  async save(request: Partial<Action>): Promise<Action> {
    const model = new this.actionModel({ ...request, _id: request.id });
    await model.save();
    return this.mapToEntity(model);
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

  findByGameId(gameId: string): Promise<Action[]> {
    throw new Error('Method not implemented.');
  }
  findByGameIdAndRound(gameId: string, round: number): Promise<Action[]> {
    throw new Error('Method not implemented.');
  }
  findByCharacterId(characterId: string): Promise<Action[]> {
    throw new Error('Method not implemented.');
  }
  findByCharacterIdAndRound(characterId: string, round: number): Promise<Action[]> {
    throw new Error('Method not implemented.');
  }
  deleteByGameId(gameId: string): Promise<void> {
    throw new Error('Method not implemented.');
  }
  deleteByCharacterId(characterId: string): Promise<void> {
    throw new Error('Method not implemented.');
  }

  private mapToEntity(doc: ActionDocument): Action {
    return {
      id: doc.id as string,
      gameId: doc.gameId,
      characterId: doc.characterId,
      round: doc.round,
      actionType: doc.actionType,
      phaseStart: doc.phaseStart,
      actionPoints: doc.actionPoints,
      attacks: doc.attacks,
      description: doc.description,
      result: doc.result,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }
}
