import type { FogLevel } from '../../../actions/domain/value-objects/fog-level.vo.js';
import type { TemperatureKind } from '../../../actor-rounds/domain/services/environment-rules.js';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { NotFoundError } from '../../../shared/domain/errors/errors.js';
import { MongoBaseRepository } from '../../../shared/infrastructure/db/mongo.base.repository.js';
import { RsqlParser } from '../../../shared/infrastructure/db/rsql-parser.js';
import type { GameRepository } from '../../application/ports/game-repository.port.js';
import { Game } from '../../domain/aggregates/game.js';
import { Actor } from '../../domain/value-objects/actor.vo.js';
import type { StrategicMember } from '../../domain/value-objects/strategic-member.vo.js';
import { GameEnvironment } from '../../domain/value-objects/game-environment.vo.js';
import type { LightType } from '../../../actions/domain/value-objects/light-type.vo.js';
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

  async updateStrategicMembers(
    strategicGameId: string,
    strategicGameOwner: string | undefined,
    members: StrategicMember[] | undefined,
  ): Promise<number> {
    const $set: Record<string, unknown> = {};
    if (members) $set.strategicMembers = members;
    if (strategicGameOwner) $set.strategicGameOwner = strategicGameOwner;
    if (Object.keys($set).length === 0) return 0;
    // The version goes up, so a write of a game loaded before does not put the old members back (it gets a 409).
    const result = await this.model.updateMany({ strategicGameId }, { $set, $inc: { version: 1 } });
    return result.modifiedCount;
  }

  async updateFactionPlayers(strategicGameId: string, factionId: string, players: string[]): Promise<number> {
    const result = await this.model.updateMany(
      { strategicGameId },
      { $set: { [`factionPlayers.${factionId}`]: players }, $inc: { version: 1 } },
    );
    return result.modifiedCount;
  }

  async removeFactionPlayers(factionId: string): Promise<number> {
    const key = `factionPlayers.${factionId}`;
    const result = await this.model.updateMany({ [key]: { $exists: true } }, { $unset: { [key]: 1 }, $inc: { version: 1 } });
    return result.modifiedCount;
  }

  protected mapToEntity(doc: GameDocument): Game {
    if (!doc) {
      throw new NotFoundError('Game', 'unknown');
    }
    const environment = doc.environment
      ? new GameEnvironment(
          doc.environment.temperatureFatigueModifier,
          doc.environment.altitudeFatigueModifier,
          (doc.environment.light as LightType | undefined) ?? undefined,
          (doc.environment.fog as FogLevel | undefined) ?? undefined,
          doc.environment.extremeTemperature
            ? {
                kind: doc.environment.extremeTemperature.kind as TemperatureKind,
                temperature: doc.environment.extremeTemperature.temperature ?? null,
                severity: doc.environment.extremeTemperature.severity ?? null,
              }
            : undefined,
        )
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
      fearThresholdsAlerted: doc.fearThresholdsAlerted ?? null,
      strategicMembers: doc.strategicMembers ?? null,
      factionPlayers: doc.factionPlayers ?? null,
      sides: (doc.sides ?? []).map(side => ({
        id: side.id,
        name: side.name ?? null,
        factionIds: [...(side.factionIds ?? [])],
        leaderActorId: side.leaderActorId ?? null,
      })),
      psychologyRules: doc.psychologyRules ?? null,
      sideFallenLevels: doc.sideFallenLevels ?? null,
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
