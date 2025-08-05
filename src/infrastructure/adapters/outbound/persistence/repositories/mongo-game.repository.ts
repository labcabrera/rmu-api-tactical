import { injectable } from 'inversify';

import { Game } from '@domain/entities/game.entity';
import { Page } from '@domain/entities/page.entity';
import { GameRepository } from '@application/ports/outbound/game.repository';

import TacticalGameModel from '../models/game.model';
import { toMongoQuery } from '../rsql-adapter';

@injectable()
export class MongoGameRepository implements GameRepository {
  async findById(id: string): Promise<Game | null> {
    const game = await TacticalGameModel.findById(id);
    return game ? this.toDomainEntity(game) : null;
  }

  async findByRsql(rsql: string, page: number, size: number): Promise<Page<Game>> {
    const skip = page * size;
    const mongoQuery = toMongoQuery(rsql);
    const [gameDocs, totalElements] = await Promise.all([
      TacticalGameModel.find(mongoQuery).skip(skip).limit(size).sort({ name: 1 }),
      TacticalGameModel.countDocuments(mongoQuery),
    ]);
    const content = gameDocs.map(doc => this.toDomainEntity(doc));
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

  async save(game: Partial<Game>): Promise<Game> {
    const gameModel = new TacticalGameModel(game);
    const savedModel = await gameModel.save();
    return this.toDomainEntity(savedModel);
  }

  async update(id: string, game: Partial<Game>): Promise<Game> {
    const updatedModel = await TacticalGameModel.findByIdAndUpdate(id, { $set: game }, { new: true });
    if (!updatedModel) {
      throw new Error(`Tactical Game with id ${id} not found`);
    }
    return this.toDomainEntity(updatedModel);
  }

  async deleteById(id: string): Promise<void> {
    const result = await TacticalGameModel.findByIdAndDelete(id);
    if (!result) {
      throw new Error(`Tactical Game with id ${id} not found`);
    }
  }

  async countBy(filter: any): Promise<number> {
    return TacticalGameModel.countDocuments(filter);
  }

  private toDomainEntity(model: any): Game {
    return {
      id: model._id.toString(),
      name: model.name,
      description: model.description,
      factions: model.factions,
      status: model.status,
      phase: model.phase,
      round: model.round,
      owner: model.owner,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    };
  }
}
