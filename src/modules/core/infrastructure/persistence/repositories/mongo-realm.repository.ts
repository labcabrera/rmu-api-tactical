import { Injectable } from '@nestjs/common';
import { RealmRepository } from 'src/modules/core/application/ports/outbound/realm-repository';
import { Page } from 'src/modules/core/domain/entities/page';
import { Realm } from 'src/modules/core/domain/entities/realm';
import { RealmModel, RealmDocument } from '../models/realm-model';
import { RsqlParser } from './rsql-parser';
import { NotFoundError, NotModifiedError } from 'src/modules/core/domain/errors/errors';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose/dist/common/mongoose.decorators';

@Injectable()
export class MongoRealmRepository implements RealmRepository {
  constructor(
    @InjectModel(RealmModel.name) private realmModel: Model<RealmDocument>,
    private rsqlParser: RsqlParser,
  ) {}

  async findById(id: string): Promise<Realm | null> {
    const readed = await this.realmModel.findById(id);
    return readed ? this.mapToEntity(readed) : null;
  }

  async findByRsql(rsql: string, page: number, size: number): Promise<Page<Realm>> {
    const skip = page * size;
    const mongoQuery = this.rsqlParser.parse(rsql);
    const [realmsDocs, totalElements] = await Promise.all([
      this.realmModel.find(mongoQuery).skip(skip).limit(size).sort({ name: 1 }),
      this.realmModel.countDocuments(mongoQuery),
    ]);
    const content = realmsDocs.map((doc) => this.mapToEntity(doc));
    return new Page<Realm>(content, page, size, totalElements);
  }

  async save(request: Partial<Realm>): Promise<Realm> {
    const model = new this.realmModel({ ...request, _id: request.id });
    await model.save();
    return this.mapToEntity(model);
  }

  async update(id: string, request: Partial<Realm>): Promise<Realm> {
    const current = await this.realmModel.findById(id);
    if (!current) {
      throw new NotFoundError('Realm', id);
    }
    const update = {};
    if (request.name && request.name !== current.name) {
      update['name'] = request.name;
    }
    if (request.description && request.description !== current.description) {
      update['description'] = request.description;
    }
    if (Object.keys(update).length === 0) {
      throw new NotModifiedError('No fields to update');
    }
    update['updatedAt'] = new Date();
    const updatedRealm = await this.realmModel.findByIdAndUpdate(id, { $set: update }, { new: true });
    if (!updatedRealm) {
      throw new NotFoundError('Realm', id);
    }
    return this.mapToEntity(updatedRealm);
  }

  async deleteById(id: string): Promise<Realm | null> {
    const result = await this.realmModel.findByIdAndDelete(id);
    return result ? this.mapToEntity(result) : null;
  }

  async existsById(id: string): Promise<boolean> {
    const exists = await this.realmModel.exists({ _id: id });
    return exists !== null;
  }

  private mapToEntity(doc: RealmDocument): Realm {
    return {
      id: doc.id,
      name: doc.name,
      description: doc.description,
      owner: doc.owner,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }
}
