import { Action } from "@/domain/entities/action.entity";
import { ActionRepository } from "@/domain/ports/action.repository";
import { ActionQuery } from "@/domain/queries/action.query";
import { Page } from "@domain/entities/page.entity";

import ActionDocument from "../models/action.model";

export class MongoActionRepository implements ActionRepository {
  async findById(id: string): Promise<Action> {
    const action = await ActionDocument.findById(id);
    if (!action) {
      throw new Error(`Tactical action with ID ${id} not found`);
    }
    return this.toEntity(action);
  }

  async find(criteria: ActionQuery): Promise<Page<Action>> {
    let filter: any = {};
    if (criteria.gameId) {
      filter.gameId = criteria.gameId;
    }
    if (criteria.characterId) {
      filter.characterId = criteria.characterId;
    }
    if (criteria.round) {
      filter.round = criteria.round;
    }
    if (criteria.actionType) {
      filter.type = criteria.actionType;
    }
    const skip = criteria.page * criteria.size;
    const list = await ActionDocument.find(filter)
      .skip(skip)
      .limit(criteria.size)
      .sort({ round: 1, createdAt: -1 });
    const count = await ActionDocument.countDocuments(filter);
    const content = list.map((action) => this.toEntity(action));
    return {
      content,
      pagination: {
        page: criteria.page,
        size: criteria.size,
        totalElements: count,
        totalPages: Math.ceil(count / criteria.size),
      },
    };
  }

  async findByGameId(gameId: string): Promise<Action[]> {
    const actions = await ActionDocument.find({ gameId: gameId }).sort({
      round: 1,
      createdAt: -1,
    });

    return actions.map((action) => this.toEntity(action));
  }

  async findByGameIdAndRound(gameId: string, round: number): Promise<Action[]> {
    const actions = await ActionDocument.find({
      gameId: gameId,
      round: round,
    }).sort({ createdAt: -1 });

    return actions.map((action) => this.toEntity(action));
  }

  async findByCharacterId(characterId: string): Promise<Action[]> {
    const actions = await ActionDocument.find({
      characterId: characterId,
    }).sort({ round: 1, createdAt: -1 });
    return actions.map((action) => this.toEntity(action));
  }

  async findByCharacterIdAndRound(
    characterId: string,
    round: number,
  ): Promise<Action[]> {
    const actions = await ActionDocument.find({
      characterId: characterId,
      round: round,
    }).sort({ createdAt: -1 });
    return actions.map((action) => this.toEntity(action));
  }

  async create(action: Omit<Action, "id">): Promise<Action> {
    const newAction = new ActionDocument(action);
    const saved = await newAction.save();
    return this.toEntity(saved);
  }

  async update(id: string, action: Partial<Action>): Promise<Action | null> {
    const updated = await ActionDocument.findByIdAndUpdate(id, action, {
      new: true,
    });
    return updated ? this.toEntity(updated) : null;
  }

  async delete(actionId: string): Promise<void> {
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
      type: document.type,
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
