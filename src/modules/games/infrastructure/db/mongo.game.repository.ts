import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose/dist/common/mongoose.decorators';
import { Model } from 'mongoose';
import { NotFoundError } from '../../../shared/domain/errors';
import { MongoBaseRepository } from '../../../shared/infrastructure/db/mongo.base.repository';
import { RsqlParser } from '../../../shared/infrastructure/db/rsql-parser';
import { GameRepository } from '../../application/ports/game.repository';
import { Game } from '../../domain/aggregates/game.aggregate';
import { Actor } from '../../domain/value-objects/actor.vo';
import { GameEnvironment } from '../../domain/value-objects/game-environment.vo';
import { GameDocument, GameModel } from '../persistence/models/game.model';

@Injectable()
export class MongoGameRepository extends MongoBaseRepository<Game, GameDocument> implements GameRepository {
  constructor(@InjectModel(GameModel.name) gameModel: Model<GameDocument>, rsqlParser: RsqlParser) {
    super(gameModel, rsqlParser);
  }

  async findByStrategicId(strategicGameId: string): Promise<Game[]> {
    return this.model.find({ strategicGameId }).then(games => games.map(doc => this.mapToEntity(doc)));
  }

  mapToEntity(doc: GameDocument): Game {
    if (!doc) {
      throw new NotFoundError('Game', 'unknown');
    }
    const environment = doc.environment
      ? new GameEnvironment(doc.environment.temperatureFatigueModifier, doc.environment.altitudeFatigueModifier)
      : undefined;
    return Game.fromProps({
      id: doc.id as string,
      strategicGameId: doc.strategicGameId,
      name: doc.name,
      status: doc.status,
      round: doc.round,
      phase: doc.phase,
      factions: doc.factions,
      actors: doc.actors ? doc.actors.map(actor => Actor.fromProps(actor)) : [],
      environment: environment,
      imageUrl: doc.imageUrl,
      description: doc.description,
      owner: doc.owner,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }
}
