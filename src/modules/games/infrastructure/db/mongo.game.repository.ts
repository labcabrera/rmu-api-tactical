import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { NotFoundError } from '../../../shared/domain/errors/errors.js';
import { MongoBaseRepository } from '../../../shared/infrastructure/db/mongo.base.repository.js';
import { RsqlParser } from '../../../shared/infrastructure/db/rsql-parser.js';
import type { GameRepository } from '../../application/ports/game-repository.port.js';
import { Game } from '../../domain/aggregates/game.js';
import { Actor } from '../../domain/value-objects/actor.vo.js';
import { GameEnvironment } from '../../domain/value-objects/game-environment.vo.js';
import { type GameDocument, GameModel } from '../persistence/models/game.model.js';

@Injectable()
export class MongoGameRepository extends MongoBaseRepository<Game, GameModel> implements GameRepository {
  constructor(@InjectModel(GameModel.name) gameModel: Model<GameModel>, rsqlParser: RsqlParser) {
    super(gameModel, rsqlParser);
  }

  async findByStrategicId(strategicGameId: string): Promise<Game[]> {
    return this.model.find({ strategicGameId }).then(games => games.map(doc => this.toEntity(doc)));
  }

  async findCreatedByFaction(factionId: string): Promise<Game[]> {
    return this.model.find({ factions: factionId, status: 'created' }).then(games => games.map(doc => this.toEntity(doc)));
  }

  async findIds(filter: Record<string, unknown>): Promise<string[]> {
    const docs = await this.model.find(filter, { _id: 1 }).lean();
    return docs.map(doc => doc._id);
  }

  protected mapToEntity(doc: GameDocument): Game {
    if (!doc) {
      throw new NotFoundError('Game', 'unknown');
    }
    const environment = doc.environment
      ? new GameEnvironment(doc.environment.temperatureFatigueModifier, doc.environment.altitudeFatigueModifier)
      : undefined;
    return Game.fromProps({
      id: doc.id,
      strategicGameId: doc.strategicGameId,
      name: doc.name,
      status: doc.status,
      round: doc.round,
      phase: doc.phase,
      factions: doc.factions,
      actors: doc.actors ? doc.actors.map(actor => Actor.fromProps(actor)) : [],
      environment: environment,
      environmentFaction: doc.environmentFaction ?? null,
      imageUrl: doc.imageUrl,
      description: doc.description,
      owner: doc.owner,
      strategicGameOwner: doc.strategicGameOwner,
      accessType: doc.accessType,
      outcome: doc.outcome ?? undefined,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }
}
