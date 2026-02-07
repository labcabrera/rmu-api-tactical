import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose/dist/common/mongoose.decorators';
import { Model } from 'mongoose';
import { Page } from '../../../shared/domain/entities/page.entity';
import { NotFoundError } from '../../../shared/domain/errors';
import { RsqlParser } from '../../../shared/infrastructure/db/rsql-parser';
import { ActorRoundRepository } from '../../application/ports/actor-round.repository';
import { ActorRound } from '../../domain/aggregates/actor-round.aggregate';
import { ActorRoundAttack } from '../../domain/value-objets/actor-round-attack.vo';
import { ActorRoundPenaltyModifier } from '../../domain/value-objets/actor-round-penalty-modifier.vo';
import { ActorRoundPenalty } from '../../domain/value-objets/actor-round-penalty.vo';
import { ActorRoundDocument, ActorRoundModel } from '../persistence/models/actor-round.model';

@Injectable()
export class MongoActorRoundRepository implements ActorRoundRepository {
  constructor(
    @InjectModel(ActorRoundModel.name) private actorRoundModel: Model<ActorRoundDocument>,
    private rsqlParser: RsqlParser,
  ) {}

  async findById(id: string): Promise<ActorRound | null> {
    return this.actorRoundModel.findById(id).then((readed) => (readed ? this.mapToEntity(readed) : null));
  }

  async findByIds(ids: string[]): Promise<ActorRound[]> {
    if (!ids || ids.length === 0) return [];
    const docs = await this.actorRoundModel.find({ _id: { $in: ids } });
    return docs.map((doc) => this.mapToEntity(doc));
  }

  async findByRsql(rsql: string, page: number, size: number): Promise<Page<ActorRound>> {
    const skip = page * size;
    const mongoQuery = this.rsqlParser.parse(rsql);
    const [characterRoundsDocs, totalElements] = await Promise.all([
      this.actorRoundModel
        .find(mongoQuery)
        .skip(skip)
        .limit(size)
        .sort({ 'initiative.roll': -1, 'initiative.base': -1 }),
      this.actorRoundModel.countDocuments(mongoQuery),
    ]);
    const content = characterRoundsDocs.map((doc) => this.mapToEntity(doc));
    return new Page<ActorRound>(content, page, size, totalElements);
  }

  findByGameAndRoundAndActors(gameId: string, round: number, actorIds: string[]): Promise<ActorRound[]> {
    const rsql = `gameId==${gameId};round==${round};actorId=in=(${actorIds.join(',')})`;
    return this.findByRsql(rsql, 0, actorIds.length).then((page) => page.content);
  }

  async findByActorIdAndRound(characterId: string, round: number): Promise<ActorRound | null> {
    return this.actorRoundModel
      .findOne({ actorId: characterId, round })
      .then((readed) => (readed ? this.mapToEntity(readed) : null));
  }

  async save(actorRound: ActorRound): Promise<ActorRound> {
    const persistable = actorRound.toProps();
    const { id, ...rest } = persistable;
    const model = new this.actorRoundModel({ ...rest, _id: id });
    await model.save();
    return this.mapToEntity(model);
  }

  async update(id: string, request: Partial<ActorRound>): Promise<ActorRound> {
    const current = await this.actorRoundModel.findById(id);
    if (!current) {
      throw new NotFoundError('CharacterRound', id);
    }
    const update = request;
    const updatedCharacterRound = await this.actorRoundModel.findByIdAndUpdate(id, { $set: update }, { new: true });
    if (!updatedCharacterRound) {
      throw new NotFoundError('CharacterRound', id);
    }
    return this.mapToEntity(updatedCharacterRound);
  }

  async deleteById(id: string): Promise<ActorRound | null> {
    return this.actorRoundModel.findByIdAndDelete(id).then((result) => (result ? this.mapToEntity(result) : null));
  }

  async deleteByGameId(gameId: string): Promise<void> {
    return this.actorRoundModel.deleteMany({ gameId }).then(() => undefined);
  }

  async findWithUndefinedInitiativeRoll(gameId: string, round: number): Promise<ActorRound[]> {
    return this.actorRoundModel
      .find({
        gameId,
        round,
        $or: [{ 'initiative.roll': { $exists: false } }, { 'initiative.roll': null }],
      })
      .then((docs) => docs.map((doc) => this.mapToEntity(doc)));
  }

  private mapToEntity(doc: ActorRoundDocument): ActorRound {
    return ActorRound.fromProps({
      id: doc._id,
      gameId: doc.gameId,
      round: doc.round,
      actorId: doc.actorId,
      actorName: doc.actorName,
      raceName: doc.raceName,
      level: doc.level,
      faction: doc.faction,
      initiative: doc.initiative,
      actionPoints: doc.actionPoints,
      hp: doc.hp,
      fatigue: doc.fatigue,
      penalty: doc.penalty
        ? new ActorRoundPenalty(
            (doc.penalty.modifiers || []).map((m: any) => new ActorRoundPenaltyModifier(m.id, m.source, m.value)),
          )
        : new ActorRoundPenalty([]),
      defense: doc.defense,
      attacks: doc.attacks.map((attackDoc) => this.mapAttackToEntity(attackDoc)),
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

  private mapAttackToEntity(doc: any): ActorRoundAttack {
    return new ActorRoundAttack(
      doc.attackName,
      doc.boModifiers || [],
      doc.baseBo,
      doc.currentBo,
      doc.type,
      doc.attackTable,
      doc.fumbleTable,
      doc.attackSize,
      doc.fumble,
      doc.canThrow,
      doc.ranges,
    );
  }
}
