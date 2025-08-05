import { injectable } from 'inversify';

import { Game } from "@domain/entities/game.entity";
import { Page } from "@domain/entities/page.entity";
import { GameRepository } from "@domain/ports/outbound/game.repository";
import { GameQuery } from "@domain/queries/game.query";

import TacticalGameModel from "../models/game.model";

@injectable()
export class MongoTacticalGameRepository implements GameRepository {
  async findById(id: string): Promise<Game> {
    const gameModel = await TacticalGameModel.findById(id);
    if (!gameModel) {
      //TODO create domain exception
      throw new Error(`Tactical Game with id ${id} not found`);
    }
    return this.toDomainEntity(gameModel);
  }

  async find(query: GameQuery): Promise<Page<Game>> {
    const { searchExpression, username, page, size } = query;
    let filter: any = {};
    if (username) {
      filter.user = username;
    }
    if (searchExpression) {
      filter.$or = [
        { name: { $regex: searchExpression, $options: "i" } },
        { description: { $regex: searchExpression, $options: "i" } },
      ];
    }
    const skip = page * size;
    const gameModels = await TacticalGameModel.find(filter)
      .skip(skip)
      .limit(size)
      .sort({ updatedAt: -1 });
    const content = gameModels.map((model) => this.toDomainEntity(model));
    const count = await TacticalGameModel.countDocuments(filter);
    return {
      content,
      pagination: {
        page: query.page,
        size: query.size,
        totalElements: count,
        totalPages: Math.ceil(count / query.size),
      },
    };
  }

  async save(game: Game): Promise<Game> {
    const gameModel = new TacticalGameModel({
      user: game.user,
      name: game.name,
      description: game.description,
      status: game.status,
      factions: game.factions,
      round: game.round,
    });

    const savedModel = await gameModel.save();
    return this.toDomainEntity(savedModel);
  }

  async update(id: string, game: Partial<Game>): Promise<Game> {
    const updatedModel = await TacticalGameModel.findByIdAndUpdate(
      id,
      { $set: game },
      { new: true },
    );
    if (!updatedModel) {
      throw new Error(`Tactical Game with id ${id} not found`);
    }
    return this.toDomainEntity(updatedModel);
  }

  async delete(id: string): Promise<void> {
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
      user: model.user,
      name: model.name,
      description: model.description,
      status: model.status,
      factions: model.factions,
      round: model.round,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    };
  }
}
