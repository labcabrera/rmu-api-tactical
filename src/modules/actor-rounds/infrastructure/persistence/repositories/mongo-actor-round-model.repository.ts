/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose/dist/common/mongoose.decorators';
import { Model } from 'mongoose';
import { Page } from '../../../../shared/domain/entities/page.entity';
import { NotFoundError } from '../../../../shared/domain/errors';
import { RsqlParser } from '../../../../shared/infrastructure/messaging/rsql-parser';
import { ActorRoundRepository } from '../../../application/ports/out/character-round.repository';
import { ActorRound } from '../../../domain/entities/actor-round.aggregate';
import { ActorRoundDocument, ActorRoundModel } from '../models/actor-round.model';

@Injectable()
export class MongoActorRoundRepository implements ActorRoundRepository {
  constructor(
    @InjectModel(ActorRoundModel.name) private characterRoundModel: Model<ActorRoundDocument>,
    private rsqlParser: RsqlParser,
  ) {}

  async deleteByGameId(gameId: string): Promise<void> {
    await this.characterRoundModel.deleteMany({ gameId });
  }

  async findById(id: string): Promise<ActorRound | null> {
    const readed = await this.characterRoundModel.findById(id);
    return readed ? this.mapToEntity(readed) : null;
  }

  async findByRsql(rsql: string, page: number, size: number): Promise<Page<ActorRound>> {
    const skip = page * size;
    const mongoQuery = this.rsqlParser.parse(rsql);
    const [characterRoundsDocs, totalElements] = await Promise.all([
      this.characterRoundModel.find(mongoQuery).skip(skip).limit(size).sort({ 'initiative.roll': -1, 'initiative.base': -1 }),
      this.characterRoundModel.countDocuments(mongoQuery),
    ]);
    const content = characterRoundsDocs.map((doc) => this.mapToEntity(doc));
    return new Page<ActorRound>(content, page, size, totalElements);
  }

  async findByActorIdAndRound(characterId: string, round: number): Promise<ActorRound | null> {
    const readed = await this.characterRoundModel.findOne({ actorId: characterId, round });
    return readed ? this.mapToEntity(readed) : null;
  }

  async save(request: Partial<ActorRound>): Promise<ActorRound> {
    const model = new this.characterRoundModel({ ...request, _id: request.id });
    await model.save();
    return this.mapToEntity(model);
  }

  async update(id: string, request: Partial<ActorRound>): Promise<ActorRound> {
    const current = await this.characterRoundModel.findById(id);
    if (!current) {
      throw new NotFoundError('CharacterRound', id);
    }
    const update = request;
    const updatedCharacterRound = await this.characterRoundModel.findByIdAndUpdate(id, { $set: update }, { new: true });
    if (!updatedCharacterRound) {
      throw new NotFoundError('CharacterRound', id);
    }
    return this.mapToEntity(updatedCharacterRound);
  }

  async deleteById(id: string): Promise<ActorRound | null> {
    const result = await this.characterRoundModel.findByIdAndDelete(id);
    return result ? this.mapToEntity(result) : null;
  }

  async countWithUndefinedInitiativeRoll(gameId: string, round: number): Promise<number> {
    return await this.characterRoundModel.countDocuments({
      gameId,
      round,
      $or: [{ 'initiative.roll': { $exists: false } }, { 'initiative.roll': null }],
    });
  }
  private mapToEntity(doc: ActorRoundDocument): ActorRound {
    return {
      id: doc.id as string,
      gameId: doc.gameId,
      actorId: doc.actorId,
      actorName: doc.actorName,
      round: doc.round,
      initiative: doc.initiative,
      actionPoints: doc.actionPoints,
      hp: doc.hp,
      fatigue: doc.fatigue,
      penalties: doc.penalties,
      attacks: doc.attacks,
      parries: doc.parries,
      effects: doc.effects,
      owner: doc.owner,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }
}
