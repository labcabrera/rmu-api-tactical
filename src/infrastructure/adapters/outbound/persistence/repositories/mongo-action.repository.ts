import { injectable } from 'inversify';

import { Action } from '@domain/entities/action.entity';
import { Page } from '@domain/entities/page.entity';
import { ActionRepository } from '@domain/ports/outbound/action.repository';

import ActionDocument from '../models/action.model';
import { toMongoQuery } from '../rsql-adapter';

@injectable()
export class MongoActionRepository implements ActionRepository {

  async findById(id: string): Promise<Action | null> {
    const action = await ActionDocument.findById(id);
    return action ? this.toEntity(action) : null;
  }

  async findByRsql(rsql: string, page: number, size: number): Promise<Page<Action>> {
    const skip = page * size;
    const mongoQuery = toMongoQuery(rsql);
    const [actionDocs, totalElements] = await Promise.all([
      ActionDocument.find(mongoQuery).skip(skip).limit(size).sort({ name: 1 }),
      ActionDocument.countDocuments(mongoQuery),
    ]);
    const content = actionDocs.map(doc => this.toEntity(doc));
    return {
      content,
      pagination: {
        page: page,
        size: size,
        totalElements,
        totalPages: Math.ceil(totalElements / size),
      },
    };
  }

  async findByGameId(gameId: string): Promise<Action[]> {
    const actions = await ActionDocument.find({ gameId: gameId }).sort({
      round: 1,
      createdAt: -1,
    });

    return actions.map(action => this.toEntity(action));
  }

  async findByGameIdAndRound(gameId: string, round: number): Promise<Action[]> {
    const actions = await ActionDocument.find({
      gameId: gameId,
      round: round,
    }).sort({ createdAt: -1 });

    return actions.map(action => this.toEntity(action));
  }

  async findByCharacterId(characterId: string): Promise<Action[]> {
    const actions = await ActionDocument.find({
      characterId: characterId,
    }).sort({ round: 1, createdAt: -1 });
    return actions.map(action => this.toEntity(action));
  }

  async findByCharacterIdAndRound(characterId: string, round: number): Promise<Action[]> {
    const actions = await ActionDocument.find({
      characterId: characterId,
      round: round,
    }).sort({ createdAt: -1 });
    return actions.map(action => this.toEntity(action));
  }

  async save(action: Partial<Action>): Promise<Action> {
    const newAction = new ActionDocument(action);
    const saved = await newAction.save();
    return this.toEntity(saved);
  }

  async update(id: string, action: Partial<Action>): Promise<Action> {
    const updated = await ActionDocument.findByIdAndUpdate(id, action, {
      new: true,
    });
    if (!updated) {
      throw new Error(`Action with id ${id} not found`);
    }
    return this.toEntity(updated);
  }

  async deleteById(actionId: string): Promise<void> {
    await ActionDocument.findByIdAndDelete(actionId);
  }

  async deleteByGameId(gameId: string): Promise<void> {
    await ActionDocument.deleteMany({ gameId: gameId });
  }

  async deleteByCharacterId(characterId: string): Promise<void> {
    await ActionDocument.deleteMany({ characterId: characterId });
  }

  private toEntity(document: any): Action {
    const entity: Action = {
      id: document._id?.toString() || document.id,
      gameId: document.gameId,
      characterId: document.characterId,
      round: document.round,
      actionType: document.actionType,
      actionPoints: document.actionPoints,
      attackInfo: document.attackInfo,
      phaseStart: document.phaseStart,
      result: document.result,
      description: document.description,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    };
    return entity;
  }
}
