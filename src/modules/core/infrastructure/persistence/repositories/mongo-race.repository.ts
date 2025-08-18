import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { RaceRepository } from 'src/modules/core/application/ports/outbound/race-repository';
import { Page } from 'src/modules/core/domain/entities/page';
import { Race, UpdateRaceRequest } from 'src/modules/core/domain/entities/race';
import { RsqlParser } from './rsql-parser';
import { NotFoundError } from 'src/modules/core/domain/errors/errors';
import { RaceDocument, RaceModel } from '../models/race-model';

@Injectable()
export class MongoRaceRepository implements RaceRepository {
  constructor(
    @InjectModel(RaceModel.name) private raceModel: Model<RaceDocument>,
    private rsqlParser: RsqlParser,
  ) {}

  async findById(id: string): Promise<Race | null> {
    const readed = await this.raceModel.findById(id);
    return readed ? this.mapToEntity(readed) : null;
  }

  async findByRsql(rsql: string, page: number, size: number): Promise<Page<Race>> {
    const skip = page * size;
    const mongoQuery = this.rsqlParser.parse(rsql);
    const [racesDocs, totalElements] = await Promise.all([
      this.raceModel.find(mongoQuery).skip(skip).limit(size).sort({ name: 1 }),
      this.raceModel.countDocuments(mongoQuery),
    ]);
    const content = racesDocs.map((doc) => this.mapToEntity(doc));
    return new Page<Race>(content, page, size, totalElements);
  }

  async save(race: Partial<Race>): Promise<Race> {
    const model = new this.raceModel({ ...race, _id: race.id });
    await model.save();
    return this.mapToEntity(model);
  }

  async update(id: string, request: UpdateRaceRequest): Promise<Race> {
    const updatedRace = await this.raceModel.findByIdAndUpdate(id, { $set: request }, { new: true });
    if (!updatedRace) {
      throw new NotFoundError('Race', id);
    }
    return this.mapToEntity(updatedRace);
  }

  async deleteById(id: string): Promise<Race | null> {
    const result = await this.raceModel.findByIdAndDelete(id);
    return result ? this.mapToEntity(result) : null;
  }

  async existsById(id: string): Promise<boolean> {
    const exists = await this.raceModel.exists({ _id: id });
    return exists !== null;
  }

  private mapToEntity(doc: RaceDocument): Race {
    return {
      id: doc._id,
      name: doc.name,
      realm: doc.realm,
      size: doc.size,
      defaultStatBonus: doc.defaultStatBonus,
      resistances: doc.resistances,
      averageHeight: doc.averageHeight,
      averageWeight: doc.averageWeight,
      strideBonus: doc.strideBonus,
      enduranceBonus: doc.enduranceBonus,
      recoveryMultiplier: doc.recoveryMultiplier,
      baseHits: doc.baseHits,
      bonusDevPoints: doc.bonusDevPoints,
      description: doc.description,
      owner: doc.owner,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }
}
