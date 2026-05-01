import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose/dist/common/mongoose.decorators';
import { Model } from 'mongoose';
import { MongoBaseRepository } from '../../../shared/infrastructure/db/mongo.base.repository';
import { RsqlParser } from '../../../shared/infrastructure/db/rsql-parser';
import { ActorRoundRepository } from '../../application/ports/actor-round.repository';
import { ActorRound } from '../../domain/aggregates/actor-round.aggregate';
import { ActorRoundAttack } from '../../domain/value-objets/actor-round-attack.vo';
import { ActorRoundPenaltyModifier } from '../../domain/value-objets/actor-round-penalty-modifier.vo';
import { ActorRoundPenalty } from '../../domain/value-objets/actor-round-penalty.vo';
import { ActorRoundDocument, ActorRoundModel } from '../persistence/models/actor-round.model';

@Injectable()
export class MongoActorRoundRepository extends MongoBaseRepository<ActorRound, ActorRoundDocument> implements ActorRoundRepository {
  constructor(@InjectModel(ActorRoundModel.name) actorRoundModel: Model<ActorRoundDocument>, rsqlParser: RsqlParser) {
    super(actorRoundModel, rsqlParser);
  }

  async findByIds(ids: string[]): Promise<ActorRound[]> {
    if (!ids || ids.length === 0) return [];
    const docs = await this.model.find({ _id: { $in: ids } });
    return docs.map(doc => this.mapToEntity(doc));
  }

  findByGameAndRoundAndActors(gameId: string, round: number, actorIds: string[]): Promise<ActorRound[]> {
    const rsql = `gameId==${gameId};round==${round};actorId=in=(${actorIds.join(',')})`;
    return this.findByRsql(rsql, 0, actorIds.length).then(page => page.content);
  }

  async findByActorIdAndRound(characterId: string, round: number): Promise<ActorRound | null> {
    return this.model.findOne({ actorId: characterId, round }).then(readed => (readed ? this.mapToEntity(readed) : null));
  }

  async deleteByGameId(gameId: string): Promise<void> {
    return this.model.deleteMany({ gameId }).then(() => undefined);
  }

  async findWithUndefinedInitiativeRoll(gameId: string, round: number): Promise<ActorRound[]> {
    return this.model
      .find({
        gameId,
        round,
        $or: [{ 'initiative.roll': { $exists: false } }, { 'initiative.roll': null }],
      })
      .then(docs => docs.map(doc => this.mapToEntity(doc)));
  }

  protected mapToEntity(doc: ActorRoundDocument): ActorRound {
    const penalty = doc.penalty
      ? new ActorRoundPenalty((doc.penalty.modifiers || []).map(m => new ActorRoundPenaltyModifier(m.id, m.source, m.value)))
      : new ActorRoundPenalty([]);
    const attacks: ActorRoundAttack[] = doc.attacks.map(
      e =>
        new ActorRoundAttack(
          e.attackName,
          e.boModifiers || [],
          e.baseBo,
          e.currentBo,
          e.type,
          e.attackTable,
          e.fumbleTable,
          e.attackSize,
          e.fumble,
          e.canThrow,
          e.meleeRange,
          e.ranges,
        ),
    );
    return ActorRound.fromProps({
      id: doc._id,
      gameId: doc.gameId,
      actorType: doc.actorType as any,
      round: doc.round,
      actorId: doc.actorId,
      actorName: doc.actorName,
      size: doc.size,
      raceName: doc.raceName,
      level: doc.level,
      factionId: doc.factionId,
      movement: doc.movement,
      initiative: doc.initiative,
      actionPoints: doc.actionPoints,
      hp: doc.hp,
      fatigue: doc.fatigue,
      penalty: penalty,
      defense: doc.defense,
      attacks: attacks,
      usedBo: doc.usedBo,
      parries: doc.parries,
      effects: doc.effects,
      alerts: doc.alerts,
      imageUrl: doc.imageUrl,
      owner: doc.owner,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }
}
